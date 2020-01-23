
// message types for bot
const mt_Typing = "typing";
const mt_Disconnect = "disconnect";
const mt_Error = "error";
const mt_Message = "message";
const mt_Email = "email";
const mt_SpellingSuggest = "spelling-suggest";

const typingCheckRate = 2000;


class Bot extends SimSageCommon {
    constructor(update_ui) {
        super();
        this.update_ui = update_ui;

	    this.message_list = [];  // conversation list
        this.bot_buttons = [];

        // for chat box clear management
        this.has_result = true;

        // do we know this user's email?
        this.knowEmail = false;
        this.askForEmailAddress = false;
        this.asking_for_spelling = false;

        // is the operator busy typing?
        this.operatorTyping = false;

        // typing checking
        this.typing_last_seen = 0;

        // voice / speech
        this.voice_enabled = settings.voice_enabled;

        this.selected_kb_name = null;
        this.selected_kbId = null;
        this.selected_sid = null;
    }

    // ui (bot multi-kb menu) selects a new item - set it as such
    select_kb(name, kbId, sid) {
        this.selected_kb_name = name;
        this.selected_kbId = kbId;
        this.selected_sid = sid;
        this.message_list = [];  // reset conversation list
        this.refresh();
    }

    // overwrite: redraw ui
    refresh() {
        if (this.update_ui) {
            this.update_ui(this);
        }
    }

    // perform a bot query - ask SimSage
    query(text) {
        if (this.is_connected && text.length > 0 && this.selected_kbId) {
            const clientQuery = {
                'organisationId': settings.organisationId,
                'kbList': [{'kbId': this.selected_kbId, 'sid': this.selected_sid}],
                'clientId': SimSageCommon.getClientId(),
                'query': text,              // search query
                'queryText': text,          // raw text
                'numResults': 1,            // bot results
                'scoreThreshold': ui_settings.bot_threshold,
                // search if possible
                'semanticSearch': ui_settings.semantic_search,
                'page': 0,
                'pageSize': 1,
                'shardSizeList': [],
                'fragmentCount': ui_settings.fragment_count,
                'maxWordDistance': ui_settings.max_word_distance,
                'searchThreshold': ui_settings.score_threshold,
                'spellingSuggest': ui_settings.use_spelling_suggest,
                'sourceId': '', // no source filter for the bot
            };

            // construct a client query (OpsModels.ClientQuery)
            this.send_message("/ws/ops/query", clientQuery);
            this.message_list.push({"text": text, "origin": "user", "time": new Date()});
            this.refresh();
        }
    }

    // overwrite: receive data back from the system
    receive_ws_data(data) {
        if (data) {
            this.has_result = true;
            if (data.messageType === mt_Error && data.error.length > 0) {
                this.has_result = false;
                this.error = data.error;
                this.refresh();

            } else if (data.messageType === mt_Disconnect) {
                this.refresh();

            } else {

                // operator is typing message received
                if (data.messageType === mt_Typing) {
                    this.operatorTyping = true;
                    this.typing_last_seen = new Date().getTime();
                    this.askForEmailAddress = false;
                    this.has_result = false;
                    this.refresh();

                } else if (data.messageType === mt_SpellingSuggest) {

                    console.log(data);

                    const buttons = [];
                    buttons.push({text: "yes", action: 'bot.correct_spelling("' + data.text + '");'});
                    buttons.push({text: "no", action: 'bot.no_to_spelling();'});
                    this.asking_for_spelling = true;

                    this.message_list.push({
                        "text": "Did you mean: " + data.text, "origin": "simsage",
                        "buttons": buttons, "urlList": [], "imageList": [], "time": new Date()
                    });

                    this.refresh();

                } else if (data.messageType === mt_Message && !this.asking_for_spelling) {

                    console.log(data);
                    this.error = ''; // no errors
                    let speak_text = ''; // nothing to say (yet)

                    if (data.text && data.text.length > 0) {
                        this.message_list.push({
                            "text": SimSageCommon.highlight(data.text), "origin": "simsage",
                            "urlList": data.urlList, "imageList": data.imageList, "time": new Date()
                        });
                        speak_text = strip_html(data.text);
                        this.has_result = data.hasResult;

                    } else if (data.resultList && data.resultList.length > 0) {
                        // did we get a search result instead?
                        this.message_list.push({
                            "text": ui_settings.no_result_message,
                            "origin": "simsage",
                            "urlList": [],
                            "imageList": [],
                            "time": new Date()
                        });

                        // and add the result text as a result
                        this.message_list.push({
                            "text": SimSageCommon.highlight(data.resultList[0].textList[0]),
                            "origin": "simsage",
                            "urlList": [],
                            "imageList": [],
                            "time": new Date()
                        });

                        this.has_result = true;

                    } else {
                        // no bot and no search results
                        this.has_result = false;
                    }

                    // copy the know email flag from our results
                    if (!this.knowEmail && data.knowEmail) {
                        this.knowEmail = data.knowEmail;
                    }

                    // do we want to ask for their email address?
                    this.askForEmailAddress = !this.has_result && !this.knowEmail && ui_settings.ask_email;

                    if (this.voice_enabled && speak_text.length > 0) {
                        const synth = window.speechSynthesis;
                        const voices = synth.getVoices();
                        if (synth && voices && voices.length > 3) {
                            const msg = new SpeechSynthesisUtterance(speak_text);
                            msg.voice = voices[4];
                            synth.speak(msg);
                        }
                    }

                    this.refresh();
                }
            }
        }
    }

    toggleVoice(event) {
        event.stopPropagation();
        this.voice_enabled = !this.voice_enabled;
        this.refresh();
    }

    // is the operator still typing?
    typingTick() {
        if (this.operatorTyping && (this.typing_last_seen + typingCheckRate) < new Date().getTime()) {
            this.operatorTyping = false;
            this.refresh();
        }
    }

    static convertToCSV(objArray) {
        let array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
        let str = '';
        for (let i = 0; i < array.length; i++) {
            let line = '';
            for (let j = 0; j < array[i].length; j++) {
                if (line.length > 0) line += '\t';
                let text = array[i][j];
                if (text && text.replace) {
                    text = text.replace(/\t/g, '    ')
                        .replace(/\n/g, ' ')
                        .replace(/\r/g, ' ');
                    if (text.indexOf(',') >= 0) {
                        text = '"' + text + '"';
                    }
                    line += text;
                } else {
                    line += " ";
                }
            }
            str += line + '\r\n';
        }
        return str;
    }

    send_email() {
        let emailAddress = $("#email").val();
        if (emailAddress && emailAddress.length > 0 && emailAddress.indexOf("@") > 0) {
            this.stompClient.send("/ws/ops/email", {},
                JSON.stringify({
                    'messageType': mt_Email,
                    'organisationId': settings.organisationId,
                    'kbList': [{kbId: this.selected_kbId, sid: this.selected_sid}],
                    'clientId': SimSageCommon.getClientId(),
                    'emailAddress': emailAddress,
                }));
            this.error = '';
            this.has_result = false;
            this.knowEmail = true;
            this.refresh();
        }
    }

    // key handling for the email popup control inside the bot window
    email_keypress(event) {
        if (event && event.keyCode === 13) {
            this.send_email();
        }
    }

    // download a list of CSV conversations the user and SimSage have been having
    download_conversations(event) {
        event.stopPropagation();
        // prepare the data
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
        return false;
    }

    // render the conversational html for the bot window
    conversation_html() {
        const kb_menu_html = this.kb_menu();
        if (kb_menu_html === '') {
            return render_bot_conversations(this.message_list, this.operatorTyping, this.error,
                                            this.askForEmailAddress, this.asking_for_spelling);
        } else {
            return kb_menu_html;
        }
    }

    // open the selected url
    visit(url) {
        if (url && url.length > 0) {
            window.open(url, '_blank');
        }
    }

    // correct the spelling
    correct_spelling(text) {
        this.asking_for_spelling = false;
        $("#query").val(text);
        this.query(text);
    }

    no_to_spelling() {
        this.asking_for_spelling = false;
        this.refresh();
    }

    // do we need to render a kb-menu?  empty string if not, otherwise the html string for it
    kb_menu() {
        if (this.selected_kb_name === null) {
            // single knowledge-base - we don't need to ask - just select it
            if (this.kb_list.length === 1) {
                this.select_kb(this.kb_list[0].name, this.kb_list[0].id, this.kb_list[0].sid);
                this.selected_kb_name = this.kb_list[0].name;
                this.selected_kbId = this.kb_list[0].id;
                this.selected_sid = this.kb_list[0].sid;

            } else if (this.kb_list.length > 1) {
                // multiple knowledge base selection menu
                return render_kb_menu(this.kb_list);
            }
        }
        return '';
    }

    // setup a chat topic?
    selected_kb_title() {
        return render_selected_kb_title(this.selected_kb_name);
    }

    // reset the selected knowledge base and allow for another selection
    reset_kbs() {
        this.selected_kb_name = null;
        this.selected_kbId = null;
        this.selected_sid = null;
        this.message_list = [];  // reset conversation list
        this.refresh();
    }

}

