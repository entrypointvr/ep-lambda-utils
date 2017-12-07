const UrlPattern = require('url-pattern')

class Router {
  constructor() {
    this.routes = {
      get: [],
      post: [],
      put: [],
      delete: []
    }
  }
  get(route, handler) {
    this.routes.get.push({ pattern: new UrlPattern(route), handler })
  }
  post(route, handler) {
    this.routes.post.push({ pattern: new UrlPattern(route), handler })
  }
  put(route, handler) {
    this.routes.put.push({ pattern: new UrlPattern(route), handler })
  }
  delete(route, handler) {
    this.routes.delete.push({ pattern: new UrlPattern(route), handler })
  }
  matchAndRun(method, path, parameters) {
    if (this.routes.hasOwnProperty(method.toLowerCase())) {
      let matchedRoute = this.routes[method.toLowerCase()].find((route) => route.pattern.match(path))
      if (matchedRoute) {
        return matchedRoute.handler(matchedRoute.pattern.match(path), parameters)
      } else {
        return Promise.reject()
      }
    } else {
      return Promise.reject()
    }
  }
  addRoutesFromRouter(router) {
    this.routes.get = router.routes.get.concat(this.routes.get)
    this.routes.post = router.routes.post.concat(this.routes.post)
    this.routes.delete = router.routes.delete.concat(this.routes.delete)
    this.routes.put = router.routes.put.concat(this.routes.put)
  }
}

module.exports = Router

//create a router, build the router up with the composite functions, then pass it a path and have it parse