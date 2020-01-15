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

///////////////////////////////////////////////////////////////////////////////////////////////////
// knowledge base selection menu

// render a single menu item for a knowledge-base for selecting one (name, kbId, sid)
function render_kb_item(kb_item) {
    const result_str = '<div class=\"chat-item\" onclick=\'bot.select_kb(\"{kb-name}\",\"{kb-id}\",\"{kb-sid}\");\'>{kb-name}</div>';
    return result_str
        .replace(/{kb-name}/g, kb_item.name)
        .replace(/{kb-id}/g, kb_item.id)
        .replace(/{kb-sid}/g, kb_item.sid);
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

// render a set of urls in their appropriate boxes for a chat result
function render_links(url_list) {
    const links = [];
    if (url_list && url_list.length > 0) {
        links.push("<br/><div class='link-box'>");
        for (const url of url_list) {
            links.push("<div class='link'><a href='" + url + "' target='_blank'>" + url + "</a></div>");
        }
        links.push("</div>");
    }
    return links.join('\n');
}

// a user's message
function render_user_message(text, url_list) {
    const result = '\
            <div class="chatbox_body_message chatbox_body_message-right">\
                <div class="bot-human" title="you said"></div>\
                <div class="bot-message">{text}{links}</div>\
            </div>';
    return result
        .replace(/{text}/g, text)
        .replace(/{links}/g, render_links(url_list))
}

// simsage message
function render_simsage_message(text, url_list) {
    const result = '\
            <div class="chatbox_body_message chatbox_body_message-left">\
                <div class="bot-machine" title="SimSage said"></div>\
                <div class="bot-message">{text}{links}</div>\
            </div>';
    return result
        .replace(/{text}/g, text)
        .replace(/{links}/g, render_links(url_list))
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
function render_bot_conversations(message_list, operator_typing, error, ask_for_email) {
    const result = ["<div style='padding: 10px;'><div/>"];
   let lastMessageUser = false;
    message_list.map((item) => {
        if (item.text && item.origin === "simsage") {
            result.push(render_simsage_message(item.text, item.urlList));
            lastMessageUser = false;
        } else if (item.text) {
            result.push(render_user_message(item.text, item.urlList));
            lastMessageUser = true;
        }
    });
    if (lastMessageUser && error === '' && operator_typing) {
        result.push(render_simsage_busy());
    }
    if (ask_for_email) {
        result.push(render_get_user_email());
    }
    return result.join('\n');
}

