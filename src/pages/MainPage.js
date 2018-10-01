import React, { Component } from 'react';
import queryString from 'query-string';
import axios from 'axios';
import socketIOClient from "socket.io-client";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { SearchBox } from '../components';


const socketEndPoint = 'http://localhost:5000'
const socket = socketIOClient(socketEndPoint)

class MainPage extends Component {

    constructor() {
        super()
        this.state = {
            videoId: '',
            urls: [],
            showLink: false,
            searchValue: '',
            isSingleVideo: false,
            isPlaylist: false,
            urlError: '',
            youtubePlaylistAPIQuery: {
                playlistId: '',
                maxResults: 20,
                key: 'AIzaSyDPdQSWNG1WGvvQVkJUcyTUZf1ODIxumxQ',
                pageToken: '',
                part: 'snippet'
            },
            youtubePlaylistItems: [],
            showPlaylistLoadMore: false,
            singleVideoInfo: ''
        }
        this.nextPageToken = ''
        this.playListVideoIDs = []
    }

    componentDidMount() {
        console.log('Mounted MainPage.js')
        socket.on('connect', () => {
            console.log(socket.id)
            this.bindSocketListeners()
        })
    }


    bindSocketListeners = () => {

        socket.on('ERROR_FOLDER_CREATING', (data) => {
            console.log(data)
        })

        socket.on('DOWNLOAD_URL_LIST_SUCCESS', (data) => {
            console.log(data)
            let playListItemDownloadLinks = this.state.youtubePlaylistItems.map((item) => {
                let videoLinks = data.find((vid) => vid.videoId === item.snippet.resourceId.videoId)
                if (videoLinks) {
                    item.downloadLinks = videoLinks.links
                } else {
                    item.downloadLinks = []
                }
                return item
            })
            this.setState({ youtubePlaylistItems: playListItemDownloadLinks })
        })

        socket.on('MULTI_DOWNLOAD_COMPLETE', (data) => {
            console.log('MULTI_DOWNLOAD_COMPLETE: ', data)
        })

        socket.on('DOWNLOAD_URL_LIST_FAILED', (err) => {
            console.log(err, err.response)
        })

    }

    handleVideoSearch = () => {
        const { youtubePlaylistAPIQuery, youtubePlaylistItems, isSingleVideo, isPlaylist, videoId } = this.state
        console.log(this.state)
        if (isPlaylist) {
            axios.get(`https://www.googleapis.com/youtube/v3/playlistItems?${queryString.stringify(youtubePlaylistAPIQuery)}`)
                .then((response) => {
                    console.log(response)
                    this.setState({
                        youtubePlaylistItems: youtubePlaylistAPIQuery.pageToken === '' ? response.data.items : [...youtubePlaylistItems, ...response.data.items],
                        showPlaylistLoadMore: response.data.nextPageToken ? true : false,
                        youtubePlaylistAPIQuery: {
                            ...youtubePlaylistAPIQuery,
                            pageToken: response.data.nextPageToken
                        }
                    }, () => {
                        this.playListVideoIDs = []
                        this.playListVideoIDs = response.data.items.map((item) => item.snippet.resourceId.videoId)
                        console.log(this.playListVideoIDs)
                        socket.emit('DOWNLOAD_URL_LIST', { videoIds: this.playListVideoIDs })
                    })
                }).catch((err) => {
                    console.log(err, err.response)
                    if (err) {
                        this.setState({
                            urlError: true
                        }, () => {
                            toast.error(err && err.response.data.error.message || "Something Went Wrong...");
                        })
                    }
                })
        } else if (isSingleVideo) {
            axios.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=AIzaSyDPdQSWNG1WGvvQVkJUcyTUZf1ODIxumxQ`)
                .then((response) => {
                    console.log(response)
                    this.setState({
                        singleVideoInfo: response.data.items.length > 0 && response.data.items[0]
                    })
                }).catch((err) => {
                    console.log(err, err.response)
                    if (err) {
                        this.setState({
                            urlError: true
                        }, () => {
                            toast.error(err && err.response.data.error.message || "Something Went Wrong...");
                        })
                    }
                })
        }
    }

    render() {
        const { searchValue, showPlaylistLoadMore, isPlaylist, youtubePlaylistItems } = this.state
        console.log(this.state)
        return (
            <div>
                <SearchBox
                    type='text'
                    label='Enter Youtube Video Link'
                    name='ytLink'
                    value={searchValue}
                    onChange={(e) => {
                        let parsedURL = (queryString.parseUrl(e.target.value))
                        this.setState({
                            searchValue: e.target.value,
                            isPlaylist: e.target.value.indexOf('playlist') > -1 ? true : false,
                            isSingleVideo: e.target.value.indexOf('watch?v') > -1 ? true : false,
                            videoId: parsedURL.query ? (parsedURL.query.v || parsedURL.query.list) : '',
                            urlError: (!parsedURL.query.v || !parsedURL.query.list) ? true : false,
                            youtubePlaylistItems: this.state.youtubePlaylistAPIQuery.playlistId === parsedURL.query && (parsedURL.query.v || parsedURL.query.list) ? [] : this.state.youtubePlaylistItems,
                            youtubePlaylistAPIQuery: {
                                ... this.state.youtubePlaylistAPIQuery,
                                playlistId: parsedURL.query ? (parsedURL.query.v || parsedURL.query.list) : '',
                            }
                        })

                    }}
                />
                <button
                    onClick={this.handleVideoSearch}
                    style={{ marginTop: '25px' }}
                >
                    Search
                </button>
                {showPlaylistLoadMore && <button
                    onClick={this.handleVideoSearch}
                    style={{ marginTop: '25px' }}
                >
                    Load More
                </button>}
                <ToastContainer />
                {
                    isPlaylist && youtubePlaylistItems.length > 0 &&
                    <div style={{ marginTop: '50px' }}>
                        {
                            youtubePlaylistItems.map((video, index) => {
                                return (
                                    <div className="video-card" key={video.id}>
                                        <img src={video.snippet.thumbnails.high.url} alt="video-img" />
                                        <p>{video.snippet.title}</p>
                                        {
                                            video.downloadLinks && video.downloadLinks.length > 0 &&
                                            <div className="video-card-links">
                                                {video.downloadLinks.map((link) => {
                                                    return (
                                                        <a href={link.url} key={link.url}>{link.type}-{link.size}</a>
                                                    )
                                                })}
                                            </div>
                                        }
                                    </div>
                                )
                            })
                        }
                    </div>
                }
            </div>
        );
    }
}

export default MainPage;