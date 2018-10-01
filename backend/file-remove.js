const findRemoveSync = require('find-remove')

let deleteFiles = findRemoveSync(__dirname + '/downloads/', {
  age: {
    seconds: 3600
  },
  // extensions: '.zip'
})
console.log(__dirname + '/downloads/')
console.log(deleteFiles)