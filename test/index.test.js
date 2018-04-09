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
    expect(parameters.query.test).toBe('testing')
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

test('apply lambda middleware, binary data', (done) => {
  applyLambdaMiddleware((parameters, loggerObject, callback) => {
    expect(parameters).toBeDefined()
    expect(parameters.pathParameters).toBe('test')
    done()
  })({isBase64Encoded: true, httpMethod: 'POST', body: 'test', pathParameters: { proxy: 'test' }}, {}, {})
})

test('apply lambda middleware, empty query parameters', (done) => {
  applyLambdaMiddleware((parameters, loggerObject, callback) => {
    expect(parameters).toBeDefined()
    expect(typeof parameters.query).toBe('object')
    done()
  })({queryStringParameters: null}, {}, {})
})

test('test cookies', (done) => {
  applyLambdaMiddleware((parameters, loggerObject, callback) => {
    expect(parameters).toBeDefined()
    expect(parameters.cookies.authorization).toBe('12312')
    done()
  })({httpMethod: 'GET', pathParameters: { proxy: 'test' }, headers: {Cookie: 'authorization=12312'}}, {}, {})
})

test('basic router', (done) => {
  let router = new Router()
  router.get('/test/route', () => Promise.resolve(true))
  router.post('/test/route', () => Promise.resolve(true))
  router.delete('/test/route/:id', () => Promise.resolve(true))
  let routes = [
    router.matchAndRun('GET', '/test/route'),
    router.matchAndRun('GET', 'test/route'),
    router.matchAndRun('GET', '/test/route/test'),
    router.matchAndRun('GET', '/test/routes'),
    router.matchAndRun('GET', '/test/route/s'),
    router.matchAndRun('GET', '/test/route/'),
    router.matchAndRun('DELETE', '/test/route/123')
  ]
  Promise.all(routes.map(p => p.catch(() => false)))
    .then(([one, two, three, four, five, six, seven]) => {
      expect(one).toBe(true)
      expect(two).toBe(false)
      expect(three).toBe(false)
      expect(four).toBe(false)
      expect(five).toBe(false)
      expect(six).toBe(false)
      expect(seven).toBe(true)
      done()
  })
  console.log(router.toString())
})


test('router composed of other routers', (done) => {
  let router = new Router()
  let router1 = new Router()
  let router2 = new Router()
  let router3 = new Router()
  router1.get('/test/route1', () => Promise.resolve(true))
  router2.post('/test/route2', () => Promise.resolve(true))
  router3.put('/test/signedurl', () => Promise.resolve(true))
  router.addRoutesFromRouter(router1)
  router.addRoutesFromRouter(router2)
  router.addRoutesFromRouter(router3)
  let routes = [
    router.matchAndRun('GET', '/test/route1'),
    router.matchAndRun('POST', '/test/route2'),
    router.matchAndRun('PUT', '/test/signedurl')
  ]
  Promise.all(routes.map(p => p.catch(() => false)))
    .then(([one, two, three]) => {
      expect(one).toBe(true)
      expect(two).toBe(true)
      expect(three).toBe(true)
      done()
    })

  console.log(router.toString())
})