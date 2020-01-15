
// bot specific items
ui_settings = {
    // if we need to search - show this message
    no_result_message: "Hmm.  I don't know that.  Hang on, I'll do a search for an answer.",
    // if we don't have their email, how should we ask for it?
    email_message: "Would you mind giving me your email address so we can follow up with more information?",
    // voice enabled by default?
    voice_enabled: false,
    // ask users for their email if nothing found?
    ask_email: true,
    // and how sensitive the bot response should be
    bot_threshold: 0.8125,

    /////////////////////////////////////////////////
    // perform a semantic search
    semantic_search: true,
    // number of fragments per result max
    fragment_count : 1,
    // distance between hits before merging into one sentence
    max_word_distance: 20,
    // score cut-off
    score_threshold: 0.0,
};

