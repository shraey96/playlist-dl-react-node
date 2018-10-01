import React, {Component} from 'react';
import './App.css';
import socketIOClient from "socket.io-client";
import MainPage from './pages/MainPage';

const socketEndPoint = 'http://localhost:5000'
const socket = socketIOClient(socketEndPoint)

class App extends Component {

  constructor() {
    super()
    this.state = {
      videoId: '',
      urls: [],
      showLink: false
    }
    this.videoIds = ['eUMbH6X_Adc', 'Sqkm39rqmEg', 'grZ4BVcFmeA']
  }

  componentDidMount() {
    console.log('Mounted App.js')
    console.log(socket)

    socket.on('connect', () => {
      console.log(socket.id)
      this.bindSocketListeners()
    })

  }

  bindSocketListeners = () => {

    socket.on('ERROR_FOLDER_CREATING', (data) => {
      console.log(data)
    })

    socket.on('SUCCESS_FOLDER_CREATING', (data) => {
      console.log(data)
    })

    socket.on('FILES_DOWNLOAD_SUCCESS', (data) => {
      console.log(data)
    })

    socket.on('ZIP_SUCCESS', (data) => {
      console.log(data)
    })

    socket.on('MULTI_DOWNLOAD_COMPLETE', (data) => {
      console.log(data)
      this.setState({
        showLink: data.link
      }, () => {
        console.log(this.state)
        alert('Downloaded Files')
      })
    })

    socket.on('FOLDER_DELETE_COMPLETE', (data) => {
      console.log(data)
    })

    socket.on('DOWNLOAD_URL_LIST_SUCCESS', (data) => {
      console.log(data)
      let newArray = [];
      newArray.push(data[0][0].url)
      newArray.push(data[1][0].url)
      newArray.push(data[2][0].url)
      console.log(newArray)
      socket.emit('DOWNLOAD_MULTI', {urls: newArray})
    })

  }

  handleReceive = (data) => {
    console.log(this.socket.id)
    console.log(data)
  }

  handleFolderSuccess = (data) => {
    console.log(data)
  }

  handleSubmit = (e) => {
    console.log('submit')
    socket.emit('DOWNLOAD_MULTI', {urls: this.state.urls})
    console.log(socket)
  }

  handleVideoListSubmit = (e) => {
    console.log('handleVideoListSubmit submit')
    socket.emit('DOWNLOAD_URL_LIST', {videoIds: this.videoIds})
  }

  // <div className="app-container-content">
  //   <input type="text" placeholder='Multi Download' onKeyUp={(e) => {
  //       if (e.keyCode === 13) {
  //         let stateURls = [...this.state.urls]
  //         stateURls.push(encodeURI(e.target.value))
  //         this.setState({urls: stateURls})
  //       }
  //     }}/> {this.state.urls.length > 0 && this.state.urls.map((url) => <p key={url}>{url}</p>)}
  //   <button onClick={this.handleSubmit}>Submit</button>
  //   <button onClick={this.handleVideoListSubmit}>handleVideoListSubmit</button>
  //   {this.state.showLink !== false && <a href={`http://localhost:3005${this.state.showLink}`} download="download"/>}
  // </div>

  render() {
    return (<div className="app-container">
      <MainPage/>
    </div>);
  }
}

export default App;
