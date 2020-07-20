/**
 * functions for rendering bot content
 *
 */


// HELPER: remove html tags using an invisible div
function strip_html(html) {
    var tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

//////////////////////////////////////////////////////render_simsage_busy/////////////////////////////////////////////
// knowledge base selection menu

// render a single menu item for a knowledge-base for selecting one (name, kbId, sid)
function render_kb_item(kb_item) {
    const result_str = '<div class=\"chat-item\" onclick=\'bot.select_kb(\"{kb-name}\",\"{kb-id}\");\'>{kb-name}</div>';
    return result_str
        .replace(/{kb-name}/g, kb_item.name)
        .replace(/{kb-id}/g, kb_item.id);
}

// render the complete menu for a kb selection exercise
function render_kb_menu(kb_list) {
    const results = ["<div class=\"chat-topic-title\">please select a topic</div>"];
    for (const kb of kb_list) {
        results.push(render_kb_item(kb));
    }
    return results.join('\n');
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// bot title management

function render_selected_kb_title(kb_name) {
    if (kb_name && kb_name.length > 0) {
        return "<div class='chat-topic-text'>" + kb_name + "</div>" +
                "<div class='chat-topic-clear' onclick='bot.reset_kbs();' title='change topic'></div>";
    }
    return "";
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// bot conversations

/**
 * render a bot button
 * @param text the text to display in the button
 * @param action the action to perform
 */
function render_button(text, action) {
    return "<div class='bot-button' title='" + text + "' onclick='" + action + "'>" + text + "</div>";
}

function render_buttons(buttons) {
    if (buttons && buttons.length > 0) {
        const list = [];
        for (const button of buttons) {
            list.push(render_button(button.text, button.action));
        }
        return list.join("\n");
    }
    return "";
}

// get a name from a url
function get_url_name(url) {
    if (url && url.length > 0) {
        const i1 = url.lastIndexOf('/');
        if (i1 > 0) {
            const name = url.substring(i1 + 1).trim();
            if (name.length === 0) {
                const strip_list = ["http://www.", "https://www.", "http://", "https://"];
                for (const strip of strip_list) {
                    if (url.startsWith(strip)) {
                        const subName = url.substring(strip.length);
                        const i2 = subName.indexOf('.');
                        if (i2 > 0) {
                            return subName.substring(0, i2);
                        }
                        return name;
                    }
                }
                return name;
            }
            const i2 = name.indexOf('.');
            if (i2 > 0) {
                return name.substring(0, i2);
            }
            return name;
        }
    }
    return url;
}

function convert_to_buttons(url_list) {
    const buttons = [];
    if (url_list) {
        for (const url of url_list) {
            for (const sub_url of url.split(' ')) {
                if (sub_url.trim().length > 0) {
                    buttons.push({
                        text: get_url_name(sub_url),
                        action: 'bot.visit("' + sub_url + '");'
                    });
                }
            }
        }
    }
    return buttons;
}

// a user's message
function render_user_message(text, buttons) {
    const result = '\
            <div class="chatbox_body_message chatbox_body_message-right">\
                <div class="bot-human" title="you said"></div>\
                <div class="bot-message">{text}\
                <div class="bot-buttons">{links}</div></div>\
            </div>';
    return result
        .replace(/{text}/g, text)
        .replace(/{links}/g, render_buttons(buttons))
}

// simsage message
function render_simsage_message(text, buttons) {
    const result = '\
            <div class="chatbox_body_message chatbox_body_message-left">\
                <div class="bot-machine" title="SimSage said"></div>\
                <div class="bot-message">{text}\
                <div class="bot-buttons">{links}</div></div>\
            </div>';
    return result
        .replace(/{text}/g, text)
        .replace(/{links}/g, render_buttons(buttons))
}

// render a busy message (animating dots)
function render_simsage_busy() {
    return  "<div class=\"busy-image-container\"><img class=\"busy-image\" src=\"images/dots.gif\" alt=\"please wait\"></div>\n";
}

// render getting the user's email address (asking for)
function render_get_user_email() {
    return  "<div class=\"email-ask\">" + ui_settings.email_message + "\n" +
        "<input class='email-address' id='email' onkeypress='bot.email_keypress(event)' type='text' placeholder='Email Address' />" +
        "<div class='send-email-button' onclick='bot.send_email()' title='send email'></div></div>"
}

// render the complete bot message window content
function render_bot_conversations(message_list, operator_typing, error, ask_for_email, asking_for_spelling) {
    const result = ["<div style='padding: 10px;'><div/>"];
   let lastMessageUser = false;
    message_list.map((item) => {
        if (!item.showBusy) {
            if (item.text && item.origin === "simsage") {
                if (item.buttons && item.buttons.length > 0) {
                    result.push(render_simsage_message(item.text, item.buttons));
                } else {
                    result.push(render_simsage_message(item.text, convert_to_buttons(item.urlList)));
                }
                lastMessageUser = false;
            } else if (item.text) {
                result.push(render_user_message(item.text, convert_to_buttons(item.urlList)));
                lastMessageUser = true;
            }
        }
    });
    // does the last message have showBusy?
    if ((message_list.length > 0 && message_list[message_list.length - 1].showBusy) || (lastMessageUser && error === '' && operator_typing)) {
        result.push(render_simsage_busy());
    }
    if (ask_for_email && !asking_for_spelling) {
        result.push(render_get_user_email());
    }
    // display an error message?
    if (error.length > 0) {
        result.push(render_simsage_message(error, []));
    }
    return result.join('\n');
}

