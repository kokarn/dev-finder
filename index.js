const fs = require( 'fs' );
const path = require( 'path' );
const https = require( 'https' );

const Promise = require( 'promise' );

const flairs = require( './modules/flair.js' );
const loadPage = require( './modules/load.js' );
const steam = require( './modules/steam.js' );
const reddit = require( './modules/reddit.js' );

const STEAM_PAGES = 10;
const REDDIT_PAGES = 10;

const GAME_LIST = [
    'ark',
    'battlefield1',
    'csgo',
    'elite',
    'rainbow6',
];

const getGameData = function getGameData ( game, onDone ) {
    const options = {
        hostname: 'raw.githubusercontent.com',
        method: 'GET',
        path: `/kokarn/dev-tracker/master/games/${ game }/data.json`,
    };

    const request = https.request( options, ( response ) => {
        let body = '';

        response.setEncoding( 'utf8' );

        response.on( 'data', ( chunk ) => {
            body = body + chunk;
        } );

        response.on( 'end', () => {
            onDone( JSON.parse( body ) );
        } );
    } );

    request.on( 'error', ( requestError ) => {
        // eslint-disable-next-line no-console
        console.log( `problem with request: ${ requestError.message }` );
    } );

    request.end();
}

const getAccounts = function getAccounts ( developers, service, game ) {
    const activeAccounts = [];

    for( let i = 0; i < developers.length; i = i + 1 ) {
        if ( developers[ i ].accounts[ service ] ) {
            activeAccounts.push( developers[ i ].accounts[ service ] );
        }
    }

    console.log( `Loaded ${ activeAccounts.length } developers for ${ game } on ${ service }` );
    return activeAccounts;
};

const findDevelopers = function findDevelopers ( game, gameIndex ) {
    getGameData( game, ( gameData ) => {
        let developers = gameData.developers;

        if ( gameData.config && gameData.config.Steam && gameData.config.Steam.matchOnly ) {
            setTimeout( () => {
                let steamDevelopers = getAccounts( developers, 'Steam', game );

                steam.get( gameData.config.Steam.matchOnly, STEAM_PAGES )
                .then( ( users ) => {
                    let filteredUsers = steam.filter( users, game, steamDevelopers );

                    console.log( `Found ${ filteredUsers.length } new developers on Steam for ${ game }` );

                    if( filteredUsers.length > 0 ) {
                        console.log( JSON.stringify( filteredUsers, null, 4 ) );
                    }
                } )
                .catch( ( error ) => {
                    console.log( error );
                } );
            }, gameIndex * 10000 );
        }

        if ( gameData.config && gameData.config.Reddit && gameData.config.Reddit.index ) {
            let redditDevelopers = getAccounts( developers, 'Reddit', game );

            console.log( `Starting with page ${ gameData.config.Reddit.index }` );
            reddit.get( gameData.config.Reddit.index, REDDIT_PAGES )
            .then( ( topUsers ) => {
                reddit.get( `${ gameData.config.Reddit.index }/new`, REDDIT_PAGES )
                .then( ( newUsers ) => {
                    let users = reddit.filter( topUsers.concat( newUsers ), game, redditDevelopers );

                    console.log( `Found ${ users.length } new developers on Reddit for ${ game }` );

                    if( users.length > 0 ) {
                        console.log( JSON.stringify( users, null, 4 ) );
                    }
                } )
                .catch( ( error ) => {
                    console.log( error );
                } );
            } )
            .catch( ( error ) => {
                console.log( error );
            } );
        }
    } );
}

for( let i = 0; i < GAME_LIST.length; i = i + 1 ) {
    findDevelopers( GAME_LIST[ i ], i );
}