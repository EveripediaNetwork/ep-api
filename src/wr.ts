import axios from 'axios'

const apCall = async () => {
  try {
    const response: any = await axios.post('http://localhost:7000/api', {
      headers: {
        from: 'pangolin@the.zoo',
      },
    })
    console.log(response.request)
  } catch (error: any) {
    console.log(error.response.body)
  }
}

export default apCall

// {
//     "@timestamp": "2023-02-03T17:09:46.986Z",
//     "log.level": "info",
//     "message": "handled request",
//     "ecs": { "version": "1.6.0" },
//     "http": {
//         "version": "1.1",
//         "request": {
//             "method": "GET",
//             "headers": {
//                 "user-agent": "got (https://github.com/sindresorhus/got)",
//                 "from": "otter@the.zoo",
//                 "accept": "application/json",
//                 "accept-encoding": "gzip, deflate, br",
//                 "host": "localhost:3000",
//                 "connection": "close"
//             }
//         },
//         "response": { "status_code": 200, "headers": { "foo": "Bar" } }
//     },
//     "url": { "path": "/", "full": "http://localhost:3000/" },
//     "client": { "address": "::1", "ip": "::1", "port": 63270 },
//     "user_agent": { "original": "got (https://github.com/sindresorhus/got)" }
// }
