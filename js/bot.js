
class Bot {

    constructor(settings, update_ui) {
        this.ws_base = settings.ws_base;
        this.update_ui = update_ui;
        this.settings = settings;
    }

    is_connected = false;    // connected to endpoint?

    message_list = [];  // conversation list

    stompClient = null;


    // connect to the system
    ws_connect() {
        var self = this;
        if (!this.is_connected && this.ws_base) {
            // this is the socket end-point
            var socket = new SockJS(this.ws_base);
            this.stompClient = Stomp.over(socket);
            this.stompClient.connect({},
                function (frame) {
                    self.stompClient.subscribe('/chat/' + self.getClientId(), function (answer) {
                        console.log('receiving');
                        self.receiveData(JSON.parse(answer.body));
                    });
                    self.setConnected(true);
                },
                (err) => {
                    console.error(err);
                    this.setConnected(false);
                });
        }
    }

    setConnected(is_connected) {
        this.is_connected = is_connected;

        if (!is_connected) {
            if (this.stompClient !== null) {
                this.stompClient.disconnect();
                this.stompClient = null;
            }
            console.log("ws-disconnected");
            setTimeout(this.ws_connect.bind(this), 5000); // try and re-connect as a one-off in 5 seconds
        } else {
            console.log("ws-connected");
        }
        this.refresh();
    }

    sendMessage(endPoint, data) {
        if (this.is_connected) {
            this.stompClient.send(endPoint, {}, JSON.stringify(data));
        }
    }

    refresh() {
        if (this.update_ui) {
            this.update_ui(this);
        }
    }


    showError(title, errStr) {
        alert(errStr);
    }

    // create a random guid
    guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }

    // get or create a session based client id for SimSage usage
    getClientId() {
        var clientId = localStorage.getItem("bot_client_id");
        if (!clientId || clientId.length === 0) {
            clientId = this.guid();
            localStorage.setItem("bot_client_id", clientId);
        }
        return clientId;
    }

    userMessageWrapper(text) {
        return "                <div class=\"chatbox_body_message chatbox_body_message-right\">\n" +
            "                    <img src=\"images/human.svg\" alt=\"you\">\n" +
            "                    <p>" + text + "</p>\n" +
            "                </div>\n"
    }

    simSageMessageWrapper(text) {
        return "                <div class=\"chatbox_body_message chatbox_body_message-left\">\n" +
            "                    <img src=\"images/tinman.svg\" alt=\"SimSage\">\n" +
            "                    <p>" + text + "</p>\n" +
            "                </div>\n"
    }

    messageListToHtml() {
        var result = "";
        this.message_list.map((item) => {
            if (item.text && item.origin === "simsage") {
                result += this.simSageMessageWrapper(item.text);
            } else if (item.text) {
                result += this.userMessageWrapper(item.text);
            }
        });
        return result;
    }

    receiveData(data, origin) {
        if (data) {
            console.log('received data:' + JSON.stringify(data));

            if (data.error && data.error.length > 0) {
                this.showError("error", data.error);

            } else {
                if (data.text && data.text.length > 0) {
                    if (!origin) {
                        this.message_list.push({"text": data.text, "origin": "simsage"});
                    } else {
                        this.message_list.push({"text": data.text, "origin": origin});
                    }
                    this.refresh();
                }
            }
        }
    }

    reply_with_text(text) {
        if (this.is_connected && text.length > 0) {
            this.stompClient.send("/ws/ops/query", {},
                JSON.stringify({
                    'securityId': settings.sid,
                    'organisationId': settings.organisationId,
                    'kbId': settings.kbId,
                    'customerId': this.getClientId(),
                    'query': text,
                    numResults: 1,
                    scoreThreshold: 0.9
                }));
            this.message_list.push({"text": text, "origin": "user"});
            this.refresh();
        }
    }


}

