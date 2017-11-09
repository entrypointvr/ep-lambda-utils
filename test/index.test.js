const { applyLambdaMiddleware, Router } = require('../index')

test('apply lambda middleware no required fields', (done) => {
  applyLambdaMiddleware((parameters, loggerObject, callback) => {
    expect(parameters).toBeDefined()
    done()
  })({queryStringParameters: { 'test': 'testing'}}, {}, {})
})

test('apply lambda middleware required fields error', (done) => {
  applyLambdaMiddleware({requiredFields: ['test']}, (parameters, loggerObject, callback) => {})({}, {}, (err, response) => {
    expect(response.statusCode).toBe(400)
    done()
  })
})

test('apply lambda middleware required fields success', (done) => {
  applyLambdaMiddleware(['test'], (parameters, loggerObject, callback) => {
    expect(parameters).toBeDefined()
    expect(parameters.test).toBe('testing')
    expect(parameters.pathParameters).toBe('test')
    done()
  })({httpMethod: 'GET', pathParameters: { proxy: 'test' }, queryStringParameters: { 'test': 'testing'}}, {}, {})
})

test('apply lambda middleware, path parameters no required fields success', (done) => {
  applyLambdaMiddleware((parameters, loggerObject, callback) => {
    expect(parameters).toBeDefined()
    expect(parameters.pathParameters).toBe('test')
    done()
  })({httpMethod: 'GET', pathParameters: { proxy: 'test' }}, {}, {})
})

test('basic router', () => {
  let router = new Router()
  router.get('/test/route', () => {})
  router.post('/test/route', () => {})
  expect(router.matchAndRun('GET', '/test/route', () => {})).toBe(true)
  expect(router.matchAndRun('GET', '/test/route/test', () => {})).toBe(false)
  expect(router.matchAndRun('GET', '/test/routes', () => {})).toBe(false)
  expect(router.matchAndRun('GET', '/test/route/', () => {})).toBe(false)
  expect(router.matchAndRun('GET', '/test/route/', () => {})).toBe(false)
})