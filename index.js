export default function invoke(parameters) {
  const FIELDS = ['functionName', 'body', 'currentFunction']
  if(!parameters) {
    return Promise.reject('Improperly formatted request, empty request sent')
  }
  let missingParameters = FIELDS.filter((value) => !parameters.hasOwnProperty(value))
  if (missingParameters.length > 0) {
    return Promise.reject(`Missing the following parameters: ${missingParameters.join(', ')}`)
  } else {
    let stringifyBody
    try {
      stringifyBody = JSON.stringify(parameters.body)
    } catch(e) {
      return Promise.reject(`Improperly formatted request, invalid body sent`)
    }
    let response = {
      FunctionName: parameters.functionName,
      Payload: JSON.stringify({
        body: stringifyBody,
        requestContext: {
          identity: {
            userAgent: parameters.currentFunction,
            sourceIp: parameters.currentFunction
          }
        }
      })
    }
    return Promise.resolve(response)
  }
}