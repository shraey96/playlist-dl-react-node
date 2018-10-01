const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const rp = require('request-promise')
const zipFolder = require('zip-folder');
const exec = require('child_process').exec;
const socketIo = require("socket.io");
const qs = require('query-string');

//init app
const app = express();


// app.use(function(req, res, next) {
//   res.header('Access-Control-Allow-Credentials', true);
//   res.header('Access-Control-Allow-Origin', req.headers.origin);
//   res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
//   res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
//   if ('OPTIONS' == req.method) {
//     res.send(200);
//   } else {
//     next();
//   }
// });


// body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));


app.post('/multi', function (req, res) {

  let urlArray = req.body.downloadList

  // generate unique folder name acc to timestamp
  let folderUniqueName = (new Date()).getTime() + '_' + Math.random();
  console.log(folderUniqueName)

  // create unique folder name (async)
  fs.mkdir(`./downloads/${folderUniqueName}`, (err) => {
    if (err) {
      console.log('err creating folderUniqueName: ', err)
      res.json({
        error: true
      })
    } else {
      console.log('done creating folderUniqueName')

      // start download process, wait for all to complete
      let promisedDownloads = urlArray.map((url, index) => {
        return downLoadFiles(url, index, folderUniqueName)
      })

      console.log('promisedDownloads: ', promisedDownloads);

      Promise.all(promisedDownloads)
        .then((done) => {
          // all promises complete
          console.log("done: ", done, folderUniqueName)

          zipFolder(`./downloads/${folderUniqueName}`, `./downloads/${folderUniqueName}.zip`, function (err) {
            if (err) {
              console.log('error creating zip', err);
            } else {
              console.log('created zip successfully!');
              exec(`rm -Rf ./downloads/${folderUniqueName}`, function (error) {
                if (error) {
                  console.log('error deleting directory: ', error)
                } else {
                  console.log('deleted directory successfully!')
                  res.json({
                    pathToZip: `/downloads/${folderUniqueName}.zip`
                  })
                }
              })
            }
          });

        }).catch((err) => {
          console.log("err: ", err)
          exec(`rm -Rf ./downloads/${folderUniqueName}`, function (error) {
            if (error) {
              console.log('error deleting directory: ', error)
            } else {
              console.log('deleted directory successfully!')
              res.json({
                error: true,
                err
              })
            }
          })
        })
    }
  })

});




function downLoadFiles(url, index, folderUniqueName) {
  console.log('Download For: ', url)

  const parsedURL = qs.parse(url);
  let title;
  if (parsedURL.title.indexOf('mp4') > -1 || parsedURL.title.indexOf('3gp') > -1) {
    title = parsedURL.title;
  } else {
    title = `${parsedURL.title}.mp4`;
  }

  const optionsStart = {
    uri: url,
    method: 'GET',
    headers: {
      'Content-type': 'video/mp4'
    },
    encoding: null
  }


  return new Promise((resolve, reject) => {
    rp(optionsStart)
      .then(function (body, data) {
        console.log('done ajax: ', index)
        let writeStream = fs.createWriteStream(`./downloads/${folderUniqueName}/${title}`);
        writeStream.write(body, 'binary');
        writeStream.end()

        writeStream.on('finish', () => {
          console.log(`downloaded file ${title}`)
          resolve(true)
        })
        // writeStream.end()
      }).catch((err) => {
        console.log('Request multi error: ', err)
        reject(err)
      })
  })
}


app.get('/downloads/:filename', function (req, res) {
  res.download(`./downloads/${req.params.filename}`, (err) => {
    if (err) {
      console.log(err)
    } else {
      console.log('done')
      exec(`rm -Rf ./downloads/${req.params.filename}`, function (error) {
        if (error) {
          console.log('error deleting directory: ', error)
        } else {
          console.log('deleted directory successfully!')
        }
      })
    }
  })
})


// start server
let server = app.listen(5000, function () {
  console.log('Server started on PORT 5000');
});

const io = socketIo(server);

let clients = {}

io.on("connection", socket => {
  console.log("New client connected: ", socket.id)
  socket.on("disconnect", () => console.log("Client disconnected: ", socket.id));

  socket.on('DOWNLOAD_SINGLE', function (data) {
    socketDownloadSingle(socket, data)
  })

  socket.on('DOWNLOAD_MULTI', function (data) {
    socketDownloadMulti(socket, data)
  })

  socket.on('DOWNLOAD_URL_LIST', function (data) {
    let multipleURLS = data.videoIds.map((videoId) => {
      return fetchMultipleDownloadURL(videoId)
    })
    Promise.all(multipleURLS)
      .then((videoList) => {
        console.log('########## ', videoList)
        socket.emit('DOWNLOAD_URL_LIST_SUCCESS', videoList)
      }).catch((err) => {
        console.log(err)
        socket.emit('DOWNLOAD_URL_LIST_FAILED', err)
      })
  })

});


const fetchMultipleDownloadURL = (videoId) => {
  console.log('fetchMultipleDownloadURL: ', videoId)
  const rpOptions = {
    uri: `https://ytapi.p.mashape.com/json?id=${videoId}`,
    method: 'GET',
    headers: {
      'X-Mashape-Key': '3pFDLPYRE7msh2j01rsuFIzv8LaFp1XCHwHjsn0AvjhjMlKf8m'
    },
    json: true
  }
  return rp(rpOptions)
    .then(function (data) {
      return { videoId, links: data }
    }).catch((err) => {
      console.log('fetchMultipleDownloadURL Error: ', err.response)
    })
}





const socketDownloadSingle = (socket, videoId) => {
  console.log('socketDownloadSingle: ', socket.id, videoId)
  const rpOptions = {
    uri: `https://ytapi.p.mashape.com/json?id=${videoId}`,
    method: 'GET',
    headers: {
      'X-Mashape-Key': '3pFDLPYRE7msh2j01rsuFIzv8LaFp1XCHwHjsn0AvjhjMlKf8m'
    },
    json: true
  }
  rp(rpOptions)
    .then(function (data) {
      socket.emit('SINGLE_LINKS', data)
    }).catch((err) => {
      console.log('Single Link Request Error: ', err)
      socket.emit('SINGLE_LINKS_ERROR', err)
    })
}



const socketDownloadMulti = (socket, urls) => {
  console.log('socketDownloadMulti: ', socket.id)

  let urlArray = urls.urls
  let folderUniqueName = (new Date()).getTime() + '_' + Math.random();
  console.log(folderUniqueName)

  // create unique folder name (async)
  fs.mkdir(`./downloads/${folderUniqueName}`, (err) => {
    if (err) {
      console.log('err creating folderUniqueName: ', err)
      socket.emit('ERROR_FOLDER_CREATING', err)
    } else {
      console.log('done creating folderUniqueName')

      socket.emit('SUCCESS_FOLDER_CREATING', {
        folderUniqueName: folderUniqueName,
        msg: 'Starting Downloads'
      })

      // start download process, wait for all to complete
      let promisedDownloads = urlArray.map((url, index) => {
        return downLoadFiles(url, index, folderUniqueName)
      })

      console.log('promisedDownloads: ', promisedDownloads);

      Promise.all(promisedDownloads)
        .then((done) => {
          // all promises complete
          console.log("done: ", done, folderUniqueName)

          socket.emit('FILES_DOWNLOAD_SUCCESS', {
            msg: 'FILES_DOWNLOAD_SUCCESS'
          })

          zipFolder(`./downloads/${folderUniqueName}`, `./downloads/${folderUniqueName}.zip`, function (err) {
            if (err) {
              console.log('error creating zip', err);
            } else {
              console.log('created zip successfully!');

              socket.emit('ZIP_SUCCESS', {
                msg: 'ZIP_SUCCESS'
              })

              socket.emit('MULTI_DOWNLOAD_COMPLETE', {
                link: `/downloads/${folderUniqueName}.zip`
              })

              exec(`rm -Rf ./downloads/${folderUniqueName}`, function (error) {
                if (error) {
                  console.log('error deleting directory: ', error)
                } else {
                  console.log('deleted directory successfully!')
                  socket.emit('FOLDER_DELETE_COMPLETE', {
                    msg: 'All Done',
                    link: `/downloads/${folderUniqueName}.zip`
                  })
                }
              })
            }
          });

        }).catch((err) => {
          console.log("err: ", err)
          exec(`rm -Rf ./downloads/${folderUniqueName}`, function (error) {
            if (error) {
              console.log('error deleting directory: ', error)
            } else {
              console.log('deleted directory successfully!')
            }
          })
        })
    }
  })

}