
// bot specific items
ui_settings = {
    // if we need to search - show this message
    no_result_message: "Hmm.  I don't know that.  Hang on, I'll do a search for an answer.",
    // if we don't have their email, how should we ask for it?
    email_message: "Would you mind giving me your email address so we can follow up with more information?",
    // if we don't have an operator available, tell the user thusly
    operator_message: "Sorry, there are currently no free operators for you to talk to.",
    // voice enabled by default?
    voice_enabled: false,
    // ask users for their email if nothing found?
    ask_email: true,
    // and how sensitive the bot response should be
    bot_threshold: 0.8125,
    // does this UI have direct operator access?
    can_contact_ops_direct: true,

    /////////////////////////////////////////////////
    // perform a semantic search
    semantic_search: true,
    // number of fragments per result max
    fragment_count : 1,
    // distance between hits before merging into one sentence
    max_word_distance: 20,
    // correct typos?
    use_spelling_suggest: true,
};

