const has = require('lodash.has')
const apiResponse = require('ep-api-response-objects')
const logger = require('ep-basic-logger')
const cookie = require('cookie')
const Router = require('./lib/router')

function prepareLambdaInvokeBody({method, loggerObject, functionName, proxyPathParameters, parameters, token, currentFunction}) {
  const payload = {
    headers: {
      Authorization: token,
      'Content-Type': 'application/json'
    },
    pathParameters: {
      proxy: proxyPathParameters
    },
    httpMethod: method,
    requestContext: {
      identity: {
        userAgent: currentFunction,
        sourceIp: loggerObject.sourceIp
      }
    }
  }
  if(method === 'GET') {
    payload.body = JSON.stringify(parameters)pacj
  } else if (method === 'POST' || method === 'DELETE') {
    payload.queryStringParameters = parameters
  } else {
    throw 'Unknown http method type'
  }
  return ({
    FunctionName: functionName,
    Payload: JSON.stringify(payload)
  })
}

function paginateAwsFunction(awsFunction, cursorFieldName, listFieldName, prevResults) {
  let cursor = prevResults ? prevResults[cursorFieldName] : undefined
  try {
    return awsFunction({[cursorFieldName]: cursor}).promise()
      .then((response) => {
        if (response && response[listFieldName]) {
          if (response[cursorFieldName]) {
            return paginateAwsFunction(awsFunction, cursorFieldName, listFieldName, response)
          } else {
            let lambdas = prevResults ? response[listFieldName].concat(prevResults[listFieldName]) : response[listFieldName]
            return Promise.resolve(lambdas)
          }
        } else {
          return Promise.reject(`No results found for ${listFieldName}`)
        }
      })
  } catch (error) {
    return Promise.reject(`Error in paginateAwsFunction, likely caused by not binding the awsFunction to the containing object. Full error: ${error.stack}`)
  }
}


// https://develandoo.com/blog/nodejs/parsing-multipart-body-aws-lambda-function-serverless
function applyLambdaMiddleware(options, lambdaCallback) {
  let requiredFields = options.requiredFields
  // If there are is no options then switch arity
  if (!lambdaCallback) {
    lambdaCallback = options
    options = null
  }

  return (event, context, callback) => {
    const requestContext = event.requestContext || {}
    const identity = requestContext.identity || {}
    const headers = event.headers || {}
    const awsRequestId = context.awsRequestId
    const cookies = cookie.parse(headers['Cookie'] || headers['cookie'] || '')
    const token = headers['Authorization'] || cookies['Authorization']
    // Content type can sometimes be lower-case when coming through the lambda
    const contentType = headers['Content-Type'] ? headers['Content-Type'] : headers['content-type']
    const sourceIp = identity.sourceIp
    const userAgent = identity.userAgent
    const pathParams = event.pathParameters || {}
    const proxyPathParams = pathParams.proxy

    if (options && options.dontWaitForEmptyLoop) {
      context.callbackWaitsForEmptyEventLoop = false
    }

    const loggerObject = Object.assign({},
      sourceIp ? {sourceIp} : null,
      awsRequestId ? {awsRequestId} : null,
      proxyPathParams ? { path: `${event.httpMethod} ${proxyPathParams}`}: null
    )

    let parameters = {
      httpMethod: event.httpMethod,
      contentType,
      cookies,
      body: {},
      query: {}
    }
    let missingParameters

    if (token) {
      logger.info(`Token for current request: ${token}`, loggerObject)
      // If the token is available add it as a parameter so it can be accessed
      parameters.token = token
    }
    if (proxyPathParams) {
      logger.info(`Path for current request: ${proxyPathParams}`, loggerObject)
      if (!parameters) parameters = {}
      parameters.pathParameters = proxyPathParams
    } else {
      // The name of the path parameters property is based on the route in the API Gateway, if it's not proxy it will be something
      // else (ie. item) so pass that along anyways
      logger.info(`Non-proxy path for current request: ${pathParams}`, loggerObject)
      if (!parameters) parameters = {}
      parameters.pathParameters = pathParams
    }

    logger.debug(`Received request with headers: ${JSON.stringify(headers)}`, loggerObject)

    if (event.httpMethod === 'POST' || event.httpMethod === 'DELETE') {
      if (event.isBase64Encoded) {
        // A request will be base 64 encoded if the content-type matches one of the binary types specified in the api gateway
        //if this is true then don't try to JSON parse it, just return a buffer
        logger.info(`Found base encoded body of size ${event.body.length}, including in parameters`, loggerObject)
        parameters.body = new Buffer(event.body, 'base64')
      } else {
        try {
          parameters.body = JSON.parse(event.body)
          logger.logRequestStart(userAgent, parameters.body, loggerObject)
        } catch (e) {
          logger.warn(`Invalid or empty json body submitted, error while parsing: ${e}`, loggerObject)
        }
      }
    } else {
      parameters.query = event.queryStringParameters || {} // if there are no parameters just return an object anyways instead of null
      logger.logRequestStart(userAgent, event.queryStringParameters, loggerObject)
    }
    logger.info(`Processing with http method: ${event.httpMethod} and content type: ${contentType}`, loggerObject)
    if ((requiredFields && requiredFields.length > 0) && (!parameters || parameters === '' || Object.keys(parameters).length === 0)) {
      logger.error(`Bad request - empty parameters: ${parameters}`, loggerObject)
      return callback(null, apiResponse.lambda.BadRequest('Bad request empty parameters submitted'))
    }
    if (requiredFields && requiredFields.length >= 0) {
      missingParameters = requiredFields.filter((field) => !has(parameters, field))
      if (missingParameters.length > 0) {
        logger.error(`Missing parameters: ${missingParameters.join(', ')}`, loggerObject)
        return callback(null, apiResponse.lambda.BadRequest('Missing required parameters'))
      }
    }

    lambdaCallback(parameters, loggerObject, callback)
  }
}

module.exports = {
  prepareLambdaInvokeBody,
  paginateAwsFunction,
  applyLambdaMiddleware,
  Router
}

