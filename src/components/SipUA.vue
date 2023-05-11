<template>
    <div>
        <el-button @click="register">register</el-button>
        <br/>
        <el-input v-model="userNumber" placeholder="分机号"></el-input>
        <br/>
        <el-input v-model="domain" placeholder="domain"></el-input>
        <br/>
        <el-input v-model="callSipAdder" placeholder="sip地址"></el-input>
        <br/>
        <el-button @click="call">call</el-button>
        <br/>
        <el-button @click="hangup">hang up</el-button>
        <br/>
        <el-input v-model="msg" placeholder="信息"></el-input>
        <br/>
        <el-button @click="sendMsg">sendMsg</el-button>
        <br/>
        <el-button @click="getMediaState">getMediaState</el-button>
        <br/>
        <video id="video" ref="localVideoView" autoplay height="320px" width="420px"/>
        <video ref="remoteVideoStream" autoplay height="320px" width="420px"/>
        <audio ref="remoteAudioView" autoplay controls/>
    </div>
</template>

<script>
import JsSIP from "jssip";

export default {
    name: "SipUA",
    data() {
        return {
            ua: Object,
            userNumber: "",
            domain: "192.168.181.130",
            callSipAdder: "sip:" + this.userNumber + "@" + this.domain,
            msg: "",
            incomingSession: [],
            outgoingSession: [],
            localStream: Object,
            constraints: {
                audio: true,
                video: false,
                mandatory: {
                    maxWidth: 640,
                    maxHeight: 360
                }
            },
            callOptions: {
                mediaConstraints: {
                    audio: true,
                    video: false
                },
                pcConfig:
                    {
                        iceServers:
                            [
                                {
                                    urls:
                                        [
                                            "stun:stun.qq.com", "stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302", "stun:stun3.l.google.com:19302", "stun:stun4.l.google.com:19302"
                                        ]
                                },
                            ],
                    },
            }
        }
    },
    watch: {
        userNumber() {
            this.callSipAdder = "sip:" + this.userNumber + "@" + this.domain;
        },
        domain() {
            this.callSipAdder = "sip:" + this.userNumber + "@" + this.domain;
        }
    },
    mounted() {
        // this.register();
    },
    methods: {
        init() {
            const socket = new JsSIP.WebSocketInterface('wss://xcb70utx.ipyingshe.net');
            //const socket = new JsSIP.WebSocketInterface('wss://192.168.10.109:5063');
            // const socket = new JsSIP.WebSocketInterface('wss://api.atomscat.com:5063');
            const configuration = {
                sockets: [socket],
                uri: this.callSipAdder,
                contact_uri: this.callSipAdder + ';transport=wss',
                authorization_user: this.userNumber,
                password: '1234',
                display_name: this.userNumber,
                // 计时器
                session_timers: false,
                // 注册会话超时时间
                register_expires: 3600
            };
            this.ua = new JsSIP.UA(configuration);
            this.ua.on("registered", function (data) {
                console.info("registered: ", data.response.status_code, ",", data.response.reason_phrase);
            })
        },
        getLocalMedia(stream) {
            console.info('Received local media stream', stream);
            const video = this.$refs.localVideoView;
            video.srcObject = stream;
            video.onloadedmetadata = function (e) {
                video.play();
                console.log(e);
            };
            this.localStream = stream;
        },
        initMedia() {
            navigator.mediaDevices.getUserMedia(this.constraints).then(this.getLocalMedia).catch(function (err) {
                console.error(err.name + ": " + err.message);
            });
        },
        //
        getMediaState() {
            // const mediaRecorder = new MediaRecorder(this.localStream);
            console.log(this.localStream)
        },
        setRemoteStream(event) {
            const video = this.$refs.remoteVideoStream;
            const audio = this.$refs.remoteAudioView;
            video.srcObject = event.stream;
            video.onloadedmetadata = function (e) {
                video.play();
                console.log(e)
            };
            audio.srcObject = event.stream;
            audio.onloadstart = (e) => {
                audio.play();
                console.log(e);
            };
            audio.onerror = () => {
                alert('录音加载失败...');
            };
        },
        //来电处理
        inComingCall(data) {
            const that = this;
            console.info("incomingSession, answer the call");
            data.session.on("progress", function () {
                that.$confirm('是否接听?', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                }).then(() => {
                    console.log("接电话");
                    // 接电话
                    data.session.answer(that.callOptions);
                }).catch(() => {
                    // 挂断
                    console.log("接电话");
                    data.session.terminate();
                    that.ua.terminateSessions();
                });
            });
            data.session.on("accepted", function (event) {
                // the call has answered
                console.log("accepted", event);
            });
            data.session.on("confirmed", function (event) {
                // this handler will be called for incoming calls too
                console.log("confirmed", event);
            });
            data.session.on("ended", function (event) {
                // the call has ended
                console.log("ended", event);
            });
            data.session.on("failed", function (event) {
                // unable to establish the call
                console.log("failed", event);
            });
            data.session.on("addstream", function (event) {
                console.log('remote addstream', event);
                that.setRemoteStream(event);
            });
        },

        register() {
            this.init();
            this.initMedia();
            this.ua.registrator().setExtraHeaders([
                'X-Foo: bar'
            ]);
            const that = this;

            // 监听通话
            this.ua.on("newRTCSession", function (data) {
                console.log(data);
                if (data.originator === 'remote') { //incoming call
                    that.incomingSession.push(data.session);
                    that.inComingCall(data);
                } else {
                    console.info("outgoingSession");
                    that.outgoingSession.push(data.session);
                    data.session.on('connecting', function (data) {
                        console.info(data);
                    });
                }
            });

            // 监听短信
            this.ua.on("newMessage", function (data) {
                console.log(data);
                if (data.originator === 'local') {
                    console.info('onNewMessage , OutgoingRequest - ', data.request);
                } else {
                    console.info('onNewMessage , IncomingRequest - ', data.request);
                }
            });

            this.ua.on("sipEvent", function (data) {
                console.log(data);
            });

            this.ua.start();
        },
        // 拨打电话
        call() {
            const that = this;
            // Register callbacks to desired call events
            const eventHandlers = {
                'progress': function (e) {
                    console.log('call is in progress: ' + e);
                },
                'failed': function (e) {
                    console.log('call failed with cause: ' + e);
                },
                'ended': function (e) {
                    console.log('call ended with cause: ' + e);
                },
                'confirmed': function (e) {
                    console.log(e);
                },
                'peerconnection': function (event) {
                    console.log(event);
                    event.peerconnection.onaddstream = function (ev) {
                        console.info('onaddstream from remote - ', ev);
                        that.setRemoteStream(ev);
                    };
                }
            };

            const options = {
                eventHandlers: eventHandlers,
                // 配置请求头信息
                extraHeaders: ["X-set-id: 1"],
                mediaConstraints: {audio: true, video: false},
                pcConfig:
                    {
                        iceServers:
                            [
                                {
                                    urls:
                                        [
                                            "stun:stun.qq.com", "stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302", "stun:stun3.l.google.com:19302", "stun:stun4.l.google.com:19302"
                                        ]
                                },
                            ]
                    },
            };
            const session = this.ua.call(this.callSipAdder, options);
            console.log(session);
        },
        hangup() {
            for (const item in this.incomingSession) {
                try {
                    this.incomingSession.remove(item);
                    item.terminate();
                } catch (e) {
                    console.log(e);
                }
            }
            for (const item in this.outgoingSession) {
                try {
                    this.outgoingSession.remove(item);
                    item.terminate();
                } catch (e) {
                    console.log(e);
                }
            }
        },
        // 发信息
        sendMsg() {
            this.ua.sendMessage(this.callSipAdder, this.msg);
        }
    }
}
</script>

<style scoped>

</style>