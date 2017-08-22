const request = require('request')

function getScapholdToken (username, password, scapholdUrl) {
  const body = {
    query: `mutation LoginUserQuery ($input: LoginUserInput!) {
      loginUser(input: $input) {
        token
        user {
          id
          username
        }
      }
    }`,
    variables: {
      input: {
        username: username,
        password: password
      }
    }
  }
  return postToScaphold(body, scapholdUrl)
    .then(res => {
      if(res.errors) {
        return Promise.reject({message: `Error in getting token from scaphold, failed with error: ${JSON.stringify(res.errors)}`})
      }
      return Promise.resolve({token: res.data.loginUser.token})
    })
}


function postToScaphold(body, scapholdUrl, token) {
  return new Promise((resolve, reject) => {
    let options = {
      method: 'POST',
      url: scapholdUrl,
      json: true,
      body: body,
      timeout: 5000
    }
    if (token) {
      options.auth = {
        'bearer': token
      }
    }
    request(options, function (error, response, body) {
      if (error) {
        return reject(`Error when making scaphold request: ${JSON.stringify(error)}`);
      }
      resolve(body);
    })
  })
}

module.exports = {
  postToScaphold,
  getScapholdToken
}