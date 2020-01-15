
//
// manage a SimSage connection
//
class SimSageCommon {

    constructor() {
        this.is_connected = false;    // connected to endpoint?
        this.stompClient = null;      // the connection
        this.ws_base = settings.ws_base;    // endpoint
        // are we busy doing something (communicating with the outside world)
        this.busy = false;
        // error message
        this.error = '';
        this.connection_retry_count = 1;
        // kb information
        this.kb_list = [];
        this.kb = null;
    }

    // do nothing - overwritten
    refresh() {
        console.error('refresh() not overwritten');
    }

    // do nothing - overwritten
    receive_ws_data() {
        console.error('receive_ws_data() not overwritten');
    }

    // connect to SimSage
    ws_connect() {
        const self = this;
        if (!this.is_connected && this.ws_base) {
            // this is the socket end-point
            const socket = new SockJS(this.ws_base);
            this.stompClient = Stomp.over(socket);
            this.stompClient.connect({},
                function (frame) {
                    self.stompClient.subscribe('/chat/' + SimSageCommon.getClientId(), function (answer) {
                        self.receive_ws_data(JSON.parse(answer.body));
                    });
                    self.set_connected(true);
                },
                (err) => {
                    console.error(err);
                    this.set_connected(false);
                });
        }
    }

    set_connected(is_connected) {
        this.is_connected = is_connected;
        if (!is_connected) {
            if (this.stompClient !== null) {
                this.stompClient.disconnect();
                this.stompClient = null;
            }
            if (this.connection_retry_count > 1) {
                this.error = 'not connected, trying to re-connect, please wait (try ' + this.connection_retry_count + ')';
            }
            setTimeout(this.ws_connect.bind(this), 5000); // try and re-connect as a one-off in 5 seconds
            this.connection_retry_count += 1;

        } else {
            this.error = '';
            this.connection_retry_count = 1;
            this.stompClient.debug = null;
            // do we need to get the kb_list for the filters?
            if (this.kb_list.length === 0) {
                this.getKbs(); // get required kb information
            }
        }
        this.refresh();
    }

    send_message(endPoint, data) {
        if (this.is_connected) {
            this.error = '';
            this.stompClient.send(endPoint, {}, JSON.stringify(data));
        }
    }

    // get the knowledge-base information for this organisation (set in settings.js)
    getKbs() {
        const self = this;
        const url = settings.base_url + '/knowledgebase/search/info/' + encodeURIComponent(settings.organisationId);

        this.error = '';
        this.busy = true;

        this.refresh(); // notify ui

        jQuery.ajax({
            headers: {
                'Content-Type': 'application/json',
                'API-Version': settings.api_version,
            },
            'type': 'GET',
            'url': url,
            'dataType': 'json',
            'success': function (data) {
                self.kb_list = data.kbList;
                if (self.kb_list.length > 0) {
                    self.kb = self.kb_list[0];
                }
                self.error = "";
                self.connection_retry_count = 1;
                self.busy = false;
                self.refresh();
            }

        })
        .fail(function (err) {
            console.error(JSON.stringify(err));
            if (err && err["readyState"] === 0 && err["status"] === 0) {
                self.error = "Server not responding, not connected.  Trying again in 5 seconds...  [try " + self.connection_retry_count + "]";
                self.connection_retry_count += 1;
                window.setTimeout(() => self.getKbs(), 5000);
            } else {
                self.error = err;
            }
            self.busy = false;
            self.refresh();
        });
    }

    /////////////////////////////////////////////////////////////////////////////////////////
    // static helpers

    // create a random guid
    static guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }

    // do we hav access to local-storage?
    static hasLocalStorage(){
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch(e) {
            return false;
        }
    }

    // get or create a session based client id for SimSage usage
    static getClientId() {
        let clientId = "";
        const key = 'simsearch_client_id';
        const hasLs = SimSageCommon.hasLocalStorage();
        if (hasLs) {
            clientId = localStorage.getItem(key);
        }
        if (!clientId || clientId.length === 0) {
            clientId = SimSageCommon.guid(); // create a new client id
            if (hasLs) {
                localStorage.setItem(key, clientId);
            }
        }
        return clientId;
    }

    // clear a session
    static clearClientId() {
        const key = 'simsearch_client_id';
        const hasLs = SimSageCommon.hasLocalStorage();
        if (hasLs) {
            localStorage.removeItem(key);
            return true;
        }
        return false;
    }

    // replace highlight items from SimSage with style items for the UI display
    static highlight(str) {
        let str2 = str.replace(/{hl1:}/g, "<span class='hl1'>");
        str2 = str2.replace(/{hl2:}/g, "<span class='hl2'>");
        str2 = str2.replace(/{hl3:}/g, "<span class='hl3'>");
        str2 = str2.replace(/{:hl1}/g, "</span>");
        str2 = str2.replace(/{:hl2}/g, "</span>");
        str2 = str2.replace(/{:hl3}/g, "</span>");
        return str2;
    }

    // make sure a string doesn't exceed a certain size - otherwise cut it down
    static adjust_size(str) {
        if (str.length > 20) {
            return str.substr(0,10) + "..." + str.substr(str.length - 10);
        }
        return str;
    }

    // join string items in a list together with spaces
    static join(list) {
        let str = '';
        for (const item of list) {
            str += ' ' + item;
        }
        return str.trim();
    }

}

