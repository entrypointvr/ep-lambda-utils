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

test('basic router', (done) => {
  let router = new Router()
  router.get('/test/route', () => Promise.resolve(true))
  router.post('/test/route', () => Promise.resolve(true))
  let routes = [
    router.matchAndRun('GET', '/test/route'),
    router.matchAndRun('GET', 'test/route'),
    router.matchAndRun('GET', '/test/route/test'),
    router.matchAndRun('GET', '/test/routes'),
    router.matchAndRun('GET', '/test/route/s'),
    router.matchAndRun('GET', '/test/route/')
  ]
  let test = routes.map(p => p.catch(() => false))
  Promise.all(routes.map(p => p.catch(() => false)))
    .then(([one, two, three, four, five, six]) => {
      expect(one).toBe(true)
      expect(two).toBe(false)
      expect(three).toBe(false)
      expect(four).toBe(false)
      expect(five).toBe(false)
      expect(six).toBe(false)
      done()
  })
})