// The dictionary plug-in requires multiple API calls, and these are handled by:
// ddg_spice_dictionary_definition - gets the definitions of a given word (e.g. noun. A sound or a combination of sounds).
// ddg_spice_dictionary_pronunciation - gets the pronunciation of a word (e.g. wûrd). 
// ddg_spice_dictionary_audio - gets the audio file of a word.
// ddg_spice_dictionary_fallback - handles any misspellings.
//
// pronunciation and audio callbacks are loaded and executed much later -- that is, 
// after ddg_spice_dictionary_definition gets executed.

// This function gets the definition of a word.
var ddg_spice_dictionary_definition = function(api_result) {
    "use strict";

    if (api_result && api_result.length > 0) {
        var word = api_result[0].word;

        // Display the data.
        Spice.render({
            data              : api_result,
            force_big_header  : true,
            header1           : word + " (Definition)",
            source_name       : "Wordnik",
            source_url        : "http://www.wordnik.com/words/" + word,
            template_normal   : "dictionary",
            template_small    : "dictionary"
        });

        // Call the Wordnik API to display the pronunciation text and the audio.
        $(document).ready(function() {
            $.getScript("/js/spice/dictionary/pronunciation/" + word);
            $.getScript("/js/spice/dictionary/audio/" + word);
        });
    }
};

// We should shorten the part of speech before displaying the definition.
Handlebars.registerHelper('part', function(text) {
    var part_of_speech = {
        "interjection": "interj.",
        "noun": "n.",
        "verb-intransitive": "v.",
        "verb-transitive": "v.",
        "adjective": "adj.",
        "adverb": "adv.",
        "verb": "v.",
        "pronoun": "pro.",
        "conjunction": "conj.",
        "preposition": "prep.",
        "auxiliary-verb": "v.",
        "undefined": ""
    };
    return part_of_speech[text] || text;
});

// Do not encode the HTML tags, and make sure we replace xref to an anchor tag.
Handlebars.registerHelper('format', function(text) {
    // Replace the xref tag into an anchor tag.
    text = text.replace(/<xref>(\w+(\s\w+)*)<\/xref>/g, "<a href='/?q=define+$1'>$1</a>");

    // Make sure we do not encode the HTML tags.
    return new Handlebars.SafeString(text);
});

// Dictionary::Pronunciation will call this function.
// It displays the text that tells you how to pronounce a word.
var ddg_spice_dictionary_pronunciation = function(api_result) {
    "use strict";

    if(api_result && api_result.length > 0 && api_result[0].rawType === "ahd-legacy") {
        $("#pronunciation").html(api_result[0].raw);
    }
};

// Dictionary::Audio will call this function.
// It gets the link to an audio file.
var ddg_spice_dictionary_audio = function(api_result) {
    "use strict";

    var url = "";
    var $icon = $("#play-icon");

    // Sets the icon to play.
    var playIcon = function() {
        $icon.removeClass("icon-stop");
        $icon.addClass("icon-play");
    };

    // Sets the icon to stop.
    var stopIcon = function() {
        $icon.removeClass("icon-play");
        $icon.addClass("icon-stop");
    };

    if(api_result && api_result.length > 0) {
        // Find the audio url that was created by Macmillan (it usually sounds better).
        for(var i = 0; i < api_result.length; i += 1) {
            if(api_result[i].createdBy === "macmillan" && url === "") {
                url = api_result[i].fileUrl;
            }
        }

        // If we don't find Macmillan, we use the first one.
        if(url === "") {
            url = api_result[0].fileUrl;
        }
    } else {
        return;
    }

    // Play the sound when the icon is clicked. Do not let the user play 
    // without window.soundManager.
    $icon.click(function() {
        if($icon.hasClass("icon-play") && window.soundManager) {
            stopIcon();
            soundManager.play("dictionary-sound");
        }
    });

    // Load the sound and set the icon. 
    var loadSound = function() {
        // Set the sound file.
        var sound = soundManager.createSound({
            id: "dictionary-sound",
            url: "/audio/?u=" + url,
            onfinish: function() {
                playIcon();
            }
        });

        // Preload the sound file immediately because the link expires.
        sound.load();

        // Set the icon.
        playIcon();
    };

    // Initialize the soundManager object.
    var soundSetup = function() {
        window.soundManager = new SoundManager();
        soundManager.url = "/soundmanager2/swf/";
        soundManager.flashVersion = 9;
        soundManager.useFlashBlock = false;
        soundManager.useHTML5Audio = false;
        soundManager.beginDelayedInit();
        soundManager.onready(loadSound);
    };

    // Check if soundManager was already loaded. If not, we should load it.
    // See http://www.schillmania.com/projects/soundmanager2/demo/template/sm2_defer-example.html
    if(!window.soundManager) {
        window.SM2_DEFER = true;
        $.getScript("/soundmanager2/script/soundmanager2-nodebug-jsmin.js", soundSetup);
    }
};