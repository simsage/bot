
// message types for bot
const mt_Typing = "typing";
const mt_Disconnect = "disconnect";
const mt_Error = "error";
const mt_Message = "message";
const mt_Email = "email";

const typingCheckRate = 2000;


class Bot {

    constructor(settings, update_ui) {
        this.ws_base = settings.ws_base;
        this.update_ui = update_ui;
        this.settings = settings;
	    this.is_connected = false;    // connected to endpoint?
	    this.message_list = [];  // conversation list
	    this.stompClient = null;

	    // could the bot answer the question
        this.hasResult = true;
        this.hasError = false;

        // do we know this user's email?
        this.knowEmail = false;
        this.askForEmailAddress = false;

        // is the operator busy typing?
        this.operatorTyping = false;

        // typing checking
        this.typing_timer = null;
        this.typing_last_seen = 0;
    }

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
        this.hasResult = true;
        this.hasError = false;

        if (!is_connected) {
            if (this.stompClient !== null) {
                this.stompClient.disconnect();
                this.stompClient = null;
            }
            console.log("ws-disconnected");
            setTimeout(this.ws_connect.bind(this), 5000); // try and re-connect as a one-off in 5 seconds

            // checking typing timeout
            this.typing_timer = setInterval(this.typingTick.bind(this), typingCheckRate);

        } else {
            console.log("ws-connected");
            this.stompClient.debug = null;
        }
        this.refresh();
    }

    sendMessage(endPoint, data) {
        if (this.is_connected) {
            this.hasError = false;
            this.stompClient.send(endPoint, {}, JSON.stringify(data));
        }
    }

    // is the operator still typing?
    typingTick() {
        if (this.operatorTyping && (this.typing_last_seen + typingCheckRate) < new Date().getTime()) {
            this.operatorTyping = false;
            this.refresh();
        }
    }

    refresh() {
        if (this.update_ui) {
            this.update_ui(this);
        }
    }


    showError(title, errStr) {
        this.hasResult = false;
        this.hasError = true;
        alert(errStr);
        this.refresh();
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

    static linksToHtml(urlList) {
        let linkStr = "";
        if (urlList) {
            for (const url of urlList) {
                linkStr += "<div class='link'><a href='" + url + "' target='_blank'>" + url + "</a></div>";
            }
        }
        if (linkStr.length > 0) {
            linkStr = "<br/><div class='link-box'>" + linkStr + "</div>";
        }
        return linkStr;
    }

    static userMessageWrapper(text, urlList) {
        return  "<div class=\"chatbox_body_message chatbox_body_message-right\">\n" +
                "<img src=\"images/human.svg\" alt=\"you\">\n" +
                "<div class='chatbox_body_inside'>" + text + Bot.linksToHtml(urlList) + "</div>" +
                "</div>\n"
    }

    static simSageMessageWrapper(text, urlList) {
        return  "<div class=\"chatbox_body_message chatbox_body_message-left\">\n" +
                "<img src=\"images/tinman.svg\" alt=\"SimSage\">\n" +
                "<div class='chatbox_body_inside'>" + text + Bot.linksToHtml(urlList) + "</div>" +
                "</div>\n"
    }

    static systemBusyMessage() {
        return  "<div class=\"busy-image-container\"><img class=\"busy-image\" src=\"images/dots.gif\" alt=\"please wait\"></div>\n";
    }

    static systemGetUserEmail() {
        return  "<div class=\"email-ask\">" + bot_settings.email_message + "\n" +
                "<input class='email-address' id='email' onkeypress='bot.sendEmailKey(event)' type='text' placeholder='name@email.com' />" +
                "<a class='send-email-button' onclick='bot.sendEmail()'><img class='send-email-image' src='images/chevron-right.svg' alt='more information' title='send me more information' /></a>" +
                "</div>\n"
    }

    static convertToCSV(objArray) {
        var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
        var str = '';
        for (var i = 0; i < array.length; i++) {
            var line = '';
            for (var j = 0; j < array[i].length; j++) {
                if (line.length > 0) line += '\t';
                var text = array[i][j];
                if (text && text.replace) {
                    line += text.replace(/\t/g, '    ')
                        .replace(/\n/g, ' ')
                        .replace(/\r/g, ' ');
                } else {
                    line += " ";
                }
            }
            str += line + '\r\n';
        }
        return str;
    }

    sendEmail() {
        let emailAddress = $("#email").val();
        if (emailAddress && emailAddress.length > 0 && emailAddress.indexOf("@") > 0) {
            this.stompClient.send("/ws/ops/email", {},
                JSON.stringify({
                    'messageType': mt_Email,
                    'organisationId': settings.organisationId,
                    'kbList': settings.kbList,
                    'clientId': this.getClientId(),
                    'emailAddress': emailAddress,
                }));
            this.hasResult = false;
            this.hasError = false;
            this.knowEmail = true;
            this.refresh();
        }
    }

    sendEmailKey(event) {
        if (event && event.keyCode === 13) {
            this.sendEmail();
        }
    }

    downloadConversation(event) {
        event.stopPropagation();
        // perpare the data
        const data = [];
        this.message_list.map((item) => {
            data.push([item.text, item.origin, item.time]);
        });
        const downloadLink = document.createElement("a");
        const csv = Bot.convertToCSV(data);
        downloadLink.href = "data:text/csv;charset=utf-8," + escape(csv);
        downloadLink.target = "_blank";
        downloadLink.download = "conversation.csv";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }

    messageListToHtml() {
        var result = "";
        let lastMessageUser = false;
        this.message_list.map((item) => {
            if (item.text && item.origin === "simsage") {
                result += Bot.simSageMessageWrapper(item.text, item.urlList);
                lastMessageUser = false;
            } else if (item.text) {
                result += Bot.userMessageWrapper(item.text, item.urlList);
                lastMessageUser = true;
            }
        });
        if (lastMessageUser && !this.hasError && this.operatorTyping) {
            result += Bot.systemBusyMessage();
        }
        if (this.askForEmailAddress) {
            result += Bot.systemGetUserEmail();
        }
        return result;
    }

    static highlight(str) {
        str = str.replace(/{hl1:}/g, "<span class='hl1'>");
        str = str.replace(/{hl2:}/g, "<span class='hl2'>");
        str = str.replace(/{hl3:}/g, "<span class='hl3'>");
        str = str.replace(/{:hl1}/g, "</span>");
        str = str.replace(/{:hl2}/g, "</span>");
        str = str.replace(/{:hl3}/g, "</span>");
        str = str.replace(/\n/g, "<br />");
        return str;
    }

    receiveData(data, origin) {
        if (data) {
            this.hasResult = true;
            if (data.messageType === mt_Error && data.error.length > 0) {
                this.showError("error", data.error);

            } else {

                // operator is typing message received
                if (data.messageType === mt_Typing) {
                    this.operatorTyping = true;
                    this.typing_last_seen = new Date().getTime();
                    this.hasResult = false;
                    this.askForEmailAddress = false;
                    this.refresh();

                } else if (data.messageType === mt_Message) {

                    if (data.searchResult) {
                        this.message_list.push({
                            "text": bot_settings.search_message,
                            "origin": "simsage",
                            "urlList": [],
                            "imageList": [],
                            "time": new Date()
                        });
                    }
                    this.message_list.push({
                        "text": Bot.highlight(data.text), "origin": "simsage",
                        "urlList": data.urlList, "imageList": data.imageList, "time": new Date()
                    });
                    this.hasResult = data.hasResult;
                    this.hasError = false;

                    if (!this.knowEmail && data.knowEmail) {
                        this.knowEmail = data.knowEmail;
                    }

                    // do we want to ask for their email address?
                    this.askForEmailAddress = !this.hasResult && !this.knowEmail && bot_settings.ask_email;

                    this.refresh();
                }
            }
        }
    }

    reply_with_text(text) {
        if (this.is_connected && text.length > 0) {
            this.stompClient.send("/ws/ops/query", {},
                JSON.stringify({
                    'messageType': mt_Message,
                    'organisationId': settings.organisationId,
                    'kbList': settings.kbList,
                    'clientId': this.getClientId(),
                    'semanticSearch': bot_settings.semantic_search,
                    'query': text,
                    numResults: 1,
                    scoreThreshold: 0.9
                }));
            this.hasResult = false;
            this.hasError = false;
            this.askForEmailAddress = false;
            this.message_list.push({"text": text, "origin": "user", "time": new Date()});
            this.refresh();
        }
    }


}

