const { applyLambdaMiddleware } = require('../index')

test('apply lambda middleware no required fields', (done) => {
  applyLambdaMiddleware((parameters, loggerObject, callback) => {
    expect(parameters).not.toBeDefined()
    done()
  })({}, {}, {})
})

test('apply lambda middleware required fields error', (done) => {
  applyLambdaMiddleware(['test'], (parameters, loggerObject, callback) => {})({}, {}, (err, response) => {
    expect(response.statusCode).toBe(400)
    done()
  })
})

test('apply lambda middleware required fields success', (done) => {
  applyLambdaMiddleware(['test'], (parameters, loggerObject, callback) => {
    expect(parameters).toBeDefined()
    expect(parameters.test).toBe('testing')
    done()
  })({httpMethod: 'GET', queryStringParameters: { 'test': 'testing'}}, {}, {})
})