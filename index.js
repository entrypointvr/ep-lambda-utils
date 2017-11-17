const has = require('lodash.has');
const apiResponse = require('ep-api-response-objects')
const logger = require('ep-basic-logger')
const Router = require('./lib/router')
const { postToScaphold, getScapholdToken } = require('./lib/scapholdUtils')

function prepareLambdaInvokeBody(parameters) {
  return ({
    FunctionName: parameters.functionName,
    Payload: JSON.stringify({
      body: JSON.stringify(parameters.body),
      httpMethod: 'POST',
      requestContext: {
        identity: {
          userAgent: parameters.currentFunction,
          sourceIp: parameters.currentFunction
        }
      }
    })
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
    const token = headers['Authorization']
    const contentType = headers['Content-Type']
    const sourceIp = identity.sourceIp
    const userAgent = identity.userAgent

    const pathParams = event.pathParameters || {}
    const proxyPathParams = pathParams.proxy

    if (options && options.dontWaitForEmptyLoop) {
      context.callbackWaitsForEmptyEventLoop = false
    }

    const loggerObject = Object.assign({}, sourceIp ? {sourceIp} : null, awsRequestId ? {awsRequestId} : null)
    let parameters = { body: {}, query: {}}, missingParameters

    if (event.httpMethod === 'POST' || event.httpMethod === 'DELETE') {
      if (event.isBase64Encoded) {
        // A request will be base 64 encoded if the content-type matches one of the binary types specified in the api gateway
        //if this is true then don't try to JSON parse it, just return a buffer
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
      parameters.query = event.queryStringParameters
      logger.logRequestStart(userAgent, parameters.query, loggerObject)
    }
    logger.info(`Processing with http method: ${event.httpMethod}`, loggerObject)
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
    if (token) {
      logger.info(`Token for current request: ${token}`, {awsRequestId, sourceIp})
      // If the token is available add it as a parameter so it can be accessed
      parameters.token = token
    }
    if (proxyPathParams) {
      logger.info(`Path params for current request: ${proxyPathParams}`, {awsRequestId, sourceIp})
      if (!parameters) parameters = {}
      parameters.pathParameters = proxyPathParams
    }

    if (parameters) {
      parameters.httpMethod = event.httpMethod
      parameters.contentType = contentType
    }
    lambdaCallback(parameters, loggerObject, callback)
  }
}

module.exports = {
  prepareLambdaInvokeBody,
  paginateAwsFunction,
  applyLambdaMiddleware,
  postToScaphold,
  getScapholdToken,
  Router
}

