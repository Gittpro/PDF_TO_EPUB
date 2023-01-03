/* Poe eBook Framework
 Copyright 2011-2014 Metrodigi, Inc. All rights reserved. */
 
 $(function () {
    // players           :: [PlayerDescription]
    // PlayerDescription :: { button: HTMLElement, loaded: Boolean, player: String, resource: String, show: Boolean, window: Window }
    var players = $('a[data-type="audio"]').toArray().map(function (a) {
        var d = a.dataset;
        return {
            button   : a,
            loaded   : false,
            player   : d.playerId,
            resource : d.resourceId,
            show     : false,
            window   : null
        };
    });

    var button_icon = '<span class="design-icon design-icon_1"></span>';
    $('a[data-type="audio"]').on('click keydown', function (e) {
        if (e.type == "keydown") {
            if (e.which != 13 && e.which != 32) {
                return;
            }
        }
        var player  = getPlayerFromButton(e.currentTarget),
            dataset = e.currentTarget.dataset;

        e.preventDefault(), e.stopPropagation();

        if (dataset.state === 'closed') {
            if (player.loaded) {
                showPlayer(player);
            } else {
                player.show   = true;
                dataset.state = 'loading';
                $(player.button).find('p').html('Loading...');
            }            
        } else if (dataset.state === 'playing') {
            hidePlayer(player);
        }
    });

    // showPlayer :: PlayerDescription -> undefined
    function showPlayer(player) {
        var label = $(player.button).find('p').text().trim();
        var playerContainerWrapper = $(player.button).next();

        if (! playerContainerWrapper.hasClass('player-container-wrapper')) {
            playerContainerWrapper = $(player.button).parent()
        }

        $(player.button).attr('label', label);
        playerContainerWrapper.find('.player-container').addClass('show');
        player.button.dataset.state = 'playing';
        $(player.button).find('p').html('Stop Audio');

        // Start the player.
        player.window.postMessage(JSON.stringify({
            method   : 'stop',
            playerId : player.player,
            type     : 'command'
        }), '*');
    }

    // hidePlayer PlayerDescription -> undefined
    function hidePlayer(player) {
        var label = $(player.button).attr('label');
        var playerContainerWrapper = $(player.button).next();
        
        if (! playerContainerWrapper.hasClass('player-container-wrapper')) {
            playerContainerWrapper = $(player.button).parent()
        }

        playerContainerWrapper.find('.player-container').removeClass('show');
        player.button.dataset.state = 'closed';
        $(player.button).find('p').html(button_icon + label);

        // Stop the player.
        player.window.postMessage(JSON.stringify({
            method   : 'pause',
            playerId : player.player,
            type     : 'command'
        }), '*');
    }

    // getPlayerFromButton :: HTMLElement -> PlayerDescription
    function getPlayerFromButton(button) {
        return players.filter(function (p) { return p.button === button; })[0];
    }

    // getPlayerFromMessage :: String -> PlayerDescription || null;
    function getPlayerFromMessage(msg) {
        if (typeof msg !== 'string') return null;

        var message  = JSON.parse(msg),
            resource = message && message.payload && message.payload.message && message.payload.message.asset_id && message.payload.message.asset_id.value || null;

        return resource ? players.filter(function (p) { return p.resource === resource; })[0] || null : null;
    }

    window.addEventListener('message', function (e) {
        var player = getPlayerFromMessage(e.data);
        if (player && !player.loaded) {
            player.window = e.source;
            player.loaded = true;
            if (player.show) setTimeout(showPlayer.bind(null, player), 0);
        }
    });
});