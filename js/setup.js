// controls used / manipulated by this setup
const status_ctrl = $('#status');       // bot status icon
const query_box = $('#query');          // query entry system
const voice_selector = $('#voice');     // voice selector
const chat_list = $('#chat');           // chat window
const chat_topic = $('#chat-topic');    // selected knowledge-base name
const chat_cover = $(".chat-cover");     // menu selector and display

// height to adjust too if menu is displayed
const original_height = chat_list.height();
const adjusted_height = chat_list.height() - 38;

// ui update function
function update_ui(bot) {
    if (bot.is_connected) {
        status_ctrl.addClass('simsage-connected');
        status_ctrl.removeClass('simsage-disconnected');
        status_ctrl.attr("title", "Bot active");
    } else {
        status_ctrl.addClass('simsage-disconnected');
        status_ctrl.removeClass('simsage-connected');
        status_ctrl.attr("title", "Bot inactive (not connected to SimSage)");
    }
    // generate the main display html
    chat_list.html(bot.conversation_html());
    // generate the active kb item name
    chat_topic.html(bot.selected_kb_title());

    if (bot.is_connected) {
        if (bot.selected_kb_name === null) {
            chat_list.height(original_height);
            query_box.attr("disabled", "true");
            query_box.attr("placeholder", "please select a topic...");
            chat_cover.hide();
        } else {
            query_box.removeAttr("disabled");
            query_box.attr("placeholder", "chat with SimSage");
            if (bot.kb_list.length > 1) {
                chat_cover.show();
                chat_list.height(adjusted_height);
            }
            query_box.focus();
        }
    } else {
        query_box.attr("disabled", "true");
        query_box.attr("placeholder", "Not connected to SimSage...");
        chat_cover.hide();
    }
    // empty the query box if we got a result
    if (bot.has_result) {
        query_box.val("");
    }
    // allow downloading once we've got some data
    if (bot.message_list.length >= 2) {
        $("#download-link").show();
    }
    // display the voice/speech icon accordingly
    if (bot.voice_enabled) {
        voice_selector.addClass('bot-voice-enabled');
        voice_selector.removeClass('bot-voice-disabled');
        voice_selector.attr("title", "speech is enabled, click to disable");
    } else {
        voice_selector.addClass('bot-voice-disabled');
        voice_selector.removeClass('bot-voice-enabled');
        voice_selector.attr("title", "speech is off, click to enable");
    }
    // auto scroll to the bottom
    setTimeout(() => {
        var element = document.getElementById('chat');
        if (element) {
            element.scrollTop = element.scrollHeight;
        }
    }, 100);
}

// create the bot
const bot = new Bot(update_ui);

// click ont he title bar to minimize / maximize the bot window
$('.chat-header').click(function(){
    $('.chat-content').slideToggle();
    query_box.focus();
});

// pressing enter starts a search / query
function keyPress(event) {
    if (event.keyCode === 13) {
        bot.query(query_box.val());
    }
}

// connect the bot to simsage when the page is ready to do so
$(document).ready(function() {
    bot.ws_connect(); // connect to SimSage
    // minimize the bot window initially
    $('.chat-content').slideToggle();
});
