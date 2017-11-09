const UrlPattern = require('url-pattern')

class Router {
  constructor() {
    this.routes = {
      get: [],
      post: [],
      delete: []
    }
  }
  get(route, handler) {
    this.routes.get.push({ pattern: new UrlPattern(route), handler })
  }
  post(route, handler) {
    this.routes.post.push({ pattern: new UrlPattern(route), handler })
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
}

module.exports = Router

//create a router, build the router up with the composite functions, then pass it a path and have it parse