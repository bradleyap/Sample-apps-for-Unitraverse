function getAddOns(){
  return [
    {
      "module":"SampleCustomizer",
      "component_id":0,
      "contact_info":"support@unitraverse.com",
      "selection_string":"entire branch",
      "initializer":"initializeForSampleCustomizerEBHTML",
      "draw_method":"generateSampleCustomizerEBHTML"
    },
    {
      "module":"SampleCustomizer",
      "component_id":1,
      "contact_info":"support@unitraverse.com",
      "selection_string":"table",
      "initializer":"initializeForSampleCustomizerTblHTML",
      "draw_method":"generateSampleCustomizerTblHTML",
      "keydown_handler":"handleSampleCustomizerKeyDown"
    },
    {
      "module":"SampleCustomizer",
      "component_id":2,
      "contact_info":"support@unitraverse.com",
      "draw_method":"generateSampleCustomizerCellHTML"
    },
    {
      "module":"Snippetizer",
      "component_id":0,
      "contact_info":"support@unitraverse.com",
      "selection_string":"deep doc (beta)",
      "initializer":"initializeForSnippetizerDeepDocApplet",
      "draw_method":"generateSnippetizerDeepDocHTML",
      "keydown_handler":"handleSnippetizerKeyDown",
      "click_handler":"handleSnippetizerMouseDown",
      "copy_function":"copySnippetizerAppInfo"
    },
    {
      "module":"FileCabinet",
      "component_id":0,
      "contact_info":"support@unitraverse.com",
      "selection_string":"file cabinet (beta)",
      "initializer":"initializeForFileCabinetApplet",
      "draw_method":"generateFileCabinetHTML"
    },
    {
      "module":"DataSlinger",
      "component_id":0,
      "contact_info":"support@unitraverse.com",
      "initializer":"initializeDataEntryFormApplet",
      "draw_method":"generateDataEntryFormHTML",
      "keydown_handler":"handleDataEntryFormKeyDown",
      "click_handler":"handleDataEntryFormMouseDown",
      "draw_cycle_msg_handler":"dataRecordDrawCycleNotificationHandler"
    },
    {
      "module":"DataSlinger",
      "component_id":1,
      "contact_info":"support@unitraverse.com",
      "selection_string":"record aggregator",
      "initializer":"initializeRecordAggregatorApplet",
      "draw_method":"generateRecordAggregatorHTML",
      "keydown_handler":"handleRecordAggregatorKeyDown"
    },
    {
      "module":"BeliefModeller",
      "component_id":0,
      "contact_info":"support@unitraverse.com",
      "selection_string":"belief system",
      "initializer":"initializeBeliefSystemModeller",
      "draw_method":"generateBeliefSystemHTML",
      "keydown_handler":"handleBeliefModellerKeyDown",
      "dbl_click_handler":"handleBeliefModellerDoubleClick"
    },
    {
      "module":"BeliefModeller",
      "component_id":1,
      "contact_info":"support@unitraverse.com",
      "draw_method":"generateBeliefTenetEditorHTML",
      "initializer":"initializeBeliefTenetEditor",
      "keydown_handler":"handleBeliefTenetEditorKeyDown",
      "click_handler":"handleBeliefTenetEditorClick"
    },
    {
      "module":"CalendarSuite",
      "component_id":0,
      "contact_info":"support@unitraverse.com",
      "selection_string":"day calendar (under construction)",
      "initializer":"initializeDayCalendarApplet",
      "draw_method":"generateDayCalendarHTML"
    },
    {
      "module":"Timeline",
      "component_id":0,
      "contact_info":"support@unitraverse.com",
      "selection_string":"timeline",
      "scoping_object":"TLAPPV0PT001",
      "keydown_handler":"handleTimelineKeyDown"
    },
    {
      "module":"InvertableTree",
      "component_id":0,
      "contact_info":"support@unitraverse.com",
      "selection_string":"invertable tree",
      "initializer":"initializeForInvertableTree",
      "draw_method":"generateInvertableTreeHTML"
    },
    {
      "module":"PeopleChart",
      "component_id":0,
      "contact_info":"support@unitraverse.com",
      "selection_string":"people chart",
      "initializer":"initializeForPeopleChart",
      "draw_method":"generatePeopleChartHTML",
      "keydown_handler":"handlePeopleChartKeyDown"
    },
    {
      "module":"PicturePlacer",
      "component_id":0,
      "contact_info":"support@unitraverse.com",
      "selection_string":"picture",
      "initializer":"initializePicturePlacer",
      "draw_method":"generatePicturePlacerHTML",
      "keydown_handler":"handlePicturePlacerKeyDown"
    },
    {
      "module":"StackedBars",
      "component_id":0,
      "contact_info":"support@unitraverse.com",
      "selection_string":"stacked bars (under construction)",
      "initializer":"initializeStackedBarChart",
      "draw_method":"generateStackedBarHTML"
    },
    {
      "module":"Publisher",
      "component_id":0,
      "contact_info":"support@unitraverse.com",
      "selection_string":"publisher (under construction)",
      "initializer":"initializePublisher",
      "draw_method":"generatePublisherHTML"
    },
    {
      "module":"GlobalReferenceInfo",
      "component_id":0,
      "contact_info":"support@unitraverse.com",
      "draw_method":"generateGlobalReferenceInfoHTML"
    }
  ];
}