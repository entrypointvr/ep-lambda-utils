const has = require('lodash.has');
const apiResponse = require('ep-api-response-objects')
const logger = require('ep-basic-logger')
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

function applyLambdaMiddleware(requiredFields, lambdaCallback) {
  // If there are is no lambdaCallback then switch arity
  if(!lambdaCallback) {
    lambdaCallback = requiredFields
    requiredFields = null
  }
  return (event, context, callback) => {
    const requestContext = event.requestContext || {}
    const identity = requestContext.identity || {}
    const headers = event.headers || {}
    const awsRequestId = context.awsRequestId
    const token = headers['Authorization']
    const sourceIp = identity.sourceIp
    const userAgent = identity.userAgent

    const pathParams = event.pathParameters || {}
    const proxyPathParams = pathParams.proxy

    const loggerObject = Object.assign({}, sourceIp ? { sourceIp } : null, awsRequestId ? { awsRequestId } : null)
    let parameters = {}, missingParameters
    if(requiredFields && requiredFields.length > 0) {
      if(event.httpMethod === 'POST') {
        try {
          parameters = JSON.parse(event.body)
        } catch (e) {
          logger.error(`Invalid json body submitted, error while parsing: ${e}`, loggerObject)
        }
      } else {
        parameters = event.queryStringParameters
      }
      if (!parameters || parameters === '' || Object.keys(parameters).length === 0) {
        logger.error(`Bad request - empty parameters: ${parameters}`, loggerObject)
        return callback(null, apiResponse.lambda.BadRequest('Bad request empty parameters submitted'))
      }
      missingParameters = requiredFields.filter((field) => !has(parameters, field))
      if (missingParameters.length > 0) {
        logger.error(`Missing parameters: ${missingParameters.join(', ')}`, loggerObject)
        return callback(null, apiResponse.lambda.BadRequest('Missing required parameters'))
      }
    }
    logger.logRequestStart(userAgent, parameters, loggerObject)
    if (token) {
      logger.info(`Token for current request - ${token}`, {awsRequestId, sourceIp})
      // If the token is available add it as a parameter so it can be accessed
      parameters.token = token
    }
    if(proxyPathParams) {
      logger.info(`Path params for current request - ${proxyPathParams}`, {awsRequestId, sourceIp})
      parameters.pathParameters = proxyPathParams
    }
    
    parameters.httpMethod = event.httpMethod
    lambdaCallback(parameters, loggerObject, callback)
  }
}

module.exports = {
  prepareLambdaInvokeBody,
  paginateAwsFunction,
  applyLambdaMiddleware,
  postToScaphold,
  getScapholdToken
}

