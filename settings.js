
// the settings for this application - no trailing / on the base_url please
settings = {
    // the service layer end-point, change "localhost:8080" to ...
    base_url: 'https://<server>/api',
    // api version of ws_base
    api_version: 1,
    // web sockets platform endpoint for comms
    ws_base: 'https://<server>/ws-api',
    // the organisation's id to search
    organisationId: "<organisation>",
    // the knowledge bases inside this organisation to use
    kbList: [{name: "<name>", kbId: "<kb>", sid: "<sid>"}],
};

