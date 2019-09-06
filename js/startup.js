
function update_ui(bot) {
    if (bot.is_connected) {
        $('#status').addClass('simsage-connected');
        $('#status').removeClass('simsage-disconnected');
        $("#status").attr("title", "Bot active");
    } else {
        $('#status').addClass('simsage-disconnected');
        $('#status').removeClass('simsage-connected');
        $("#status").attr("title", "Bot inactive (not connected to SimSage)");
    }
    $('#chat').html(bot.messageListToHtml());
    $("#chat-topic").html(bot.setupChatTopic());

    if (bot.is_connected) {
        if (bot.selected_kb === null) {
            $("#query").attr("disabled", "true");
            $("#query").attr("placeholder", "please select a topic...");
            $(".chat-cover").hide();
        } else {
            $("#query").removeAttr("disabled");
            $("#query").attr("placeholder", "chat with SimSage");
            if (settings.kbList.length > 1) {
                $(".chat-cover").show();
            }
        }
    } else {
        $("#query").attr("disabled", "true");
        $("#query").attr("placeholder", "Not connected to SimSage...");
        $(".chat-cover").hide();
    }
    if (bot.hasResult) {
        $("#query").val("");
    }
    if (bot.message_list.length >= 2) {
        $("#download-link").show();
    }

    if (bot.voice_enabled) {
        $('#voice').addClass('bot-voice-enabled');
        $('#voice').removeClass('bot-voice-disabled');
        $("#voice").attr("title", "speech is enabled, click to disable");
    } else {
        $('#voice').addClass('bot-voice-disabled');
        $('#voice').removeClass('bot-voice-enabled');
        $("#voice").attr("title", "speech is off, click to enable");
    }

    // scroll to the bottom
    setTimeout(() => {
        var element = document.getElementById('chat');
        if (element) {
            element.scrollTop = element.scrollHeight;
        }
    }, 100);
}

let bot = new Bot(settings, update_ui);
bot.ws_connect(); // connect to server

// minimize
$('.chat-content').slideToggle();

$('.chat-header').click(function(){
    $('.chat-content').slideToggle();
    $("#query").focus();
});

function keyPress(event) {
    if (event.keyCode === 13) {
        bot.reply_with_text($("#query").val());
    }
}
