function prepareLambdaInvokeBody(parameters) {
  return ({
    FunctionName: parameters.functionName,
    Payload: JSON.stringify({
      body: JSON.stringify(parameters.body),
      requestContext: {
        identity: {
          userAgent: parameters.currentFunction,
          sourceIp: parameters.currentFunction
        }
      }
    })
  })
}

//note: if using this function with axios, pass in parameters.data
function checkPostParameters(parameters) {
  let fields = parameters.fields
  let body, missingParameters
  try {
    body = JSON.parse(parameters.body)
  }
  catch {
    return Promise.reject(`Improperly formatted requested, failed to parse body`)
  }
  missingParameters = fields.filter((value) => !body.hasOwnProperty(value))
  if (missingParameters.length > 0) {
    return Promise.reject(`Missing the following parameters: ${missingParameters.join(', ')}`)
  }
  return Promise.resolve()
}

function paginateAwsFunction(awsFunction, cursorFieldName, listFieldName, prevResults) {
  let cursor = prevResults ? prevResults[cursorFieldName]: undefined
  try {
    return awsFunction({[cursorFieldName]: cursor}).promise()
    .then((response) => {
      if (response && response[listFieldName]) {
        if(response[cursorFieldName]) {
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

module.exports = {prepareLambdaInvokeBody, checkPostParameters, paginateAwsFunction}

