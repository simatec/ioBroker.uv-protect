'use strict';

// @ts-ignore
const utils = require('@iobroker/adapter-core');
// @ts-ignore
const axios = require('axios').default;
const tools = require('./lib/tools');

let longitude;
let latitude;
let stopTimer;

let systemLang = 'de'; // system language

/**
 * The adapter instance
 * @type {ioBroker.Adapter}
 */
let adapter;
const adapterName = require('./package.json').name.split('.').pop();

/**
 * Starts the adapter instance
 * @param {Partial<utils.AdapterOptions>} [options]
 */
function startAdapter(options) {
    return adapter = utils.adapter(Object.assign({}, options, {
        name: adapterName,
        ready: main,

        unload: (callback) => {
            try {
                clearTimeout(stopTimer);
                callback();
            } catch (e) {
                callback();
            }
        },
    }));
}

function getSystemData() {
    // @ts-ignore
    return new Promise(async (resolve) => {
        try {
            adapter.getForeignObject('system.config', (err, obj) => {
                systemLang = obj.common.language;
            });
        } catch (err) {
            adapter.log.warn('Language from the system settings cannot be called up. Please check configuration!');
        }
        if (adapter.config.systemGeoData) {
            try {
                await adapter.getForeignObjectAsync("system.config", async (err, state) => {

                    if (err) {
                        adapter.log.error(err);
                        // @ts-ignore
                        resolve();
                    } else {
                        longitude = state.common.longitude;
                        latitude = state.common.latitude;
                        adapter.log.debug('System longitude: ' + state.common.longitude + ' System latitude: ' + state.common.latitude);
                        // @ts-ignore
                        resolve();
                    }
                });
            } catch (err) {
                adapter.log.warn('Astro data from the system settings cannot be called up. Please check configuration!');
                // @ts-ignore
                resolve();
            }
        } else {
            try {
                longitude = adapter.config.longitude;
                latitude = adapter.config.latitude;
                adapter.log.debug('longitude: ' + adapter.config.longitude + ' latitude: ' + adapter.config.latitude);
                // @ts-ignore
                resolve();
            } catch (err) {
                adapter.log.warn('Astro data from the system settings cannot be called up. Please check configuration!');
                // @ts-ignore
                resolve();
            }
        }
    });
}

function convertUTCDateToLocalDate(date) {
    const newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);

    const offset = date.getTimezoneOffset() / 60;
    const hours = date.getHours();

    newDate.setHours(hours - offset);

    return newDate.toISOString();
}

async function requestAPI() {
    // @ts-ignore
    return new Promise(async (resolve) => {
        try {
            adapter.log.debug('API Request started ...');

            const openUVURL = 'https://api.openuv.io/api/v1/uv';

            const openUVRequest = await axios({
                method: 'get',
                baseURL: openUVURL,
                params: {
                    lat: latitude,
                    lng: longitude
                },
                headers: {
                    'x-access-token': adapter.config.apiKey
                },
                responseType: 'json'
            });

            if (openUVRequest.data && openUVRequest.data.result) {
                adapter.log.debug('API Request successfully completed');

                adapter.log.debug(JSON.stringify(openUVRequest.data));

                // set State for uv and ozone
                await adapter.setStateAsync('uv', Math.round(openUVRequest.data.result.uv * 100) / 100, true);
                await adapter.setStateAsync('uv_time', convertUTCDateToLocalDate(new Date(openUVRequest.data.result.uv_time)), true);
                await adapter.setStateAsync('uv_max', Math.round(openUVRequest.data.result.uv_max * 100) / 100, true);
                await adapter.setStateAsync('uv_max_time', convertUTCDateToLocalDate(new Date(openUVRequest.data.result.uv_max_time)), true);
                await adapter.setStateAsync('ozone', openUVRequest.data.result.ozone, true);
                await adapter.setStateAsync('ozone_time', convertUTCDateToLocalDate(new Date(openUVRequest.data.result.ozone_time)), true);

                // created json
                let json = ({
                    "uv": Math.round(openUVRequest.data.result.uv * 100) / 100,
                    "uv_time": convertUTCDateToLocalDate(new Date(openUVRequest.data.result.uv_time)),
                    "uv_max": Math.round(openUVRequest.data.result.uv_max * 100) / 100,
                    "uv_max_time": convertUTCDateToLocalDate(new Date(openUVRequest.data.result.uv_max_time)),
                    "ozone": openUVRequest.data.result.ozone,
                    "ozone_time": convertUTCDateToLocalDate(new Date(openUVRequest.data.result.ozone_time))
                });

                await adapter.setStateAsync('uv_json', JSON.stringify(json), true);

                // set State for safe sun times
                await adapter.setStateAsync('sun_info.sun_times.solarNoon', convertUTCDateToLocalDate(new Date(openUVRequest.data.result.sun_info.sun_times.solarNoon)), true);
                await adapter.setStateAsync('sun_info.sun_times.nadir', convertUTCDateToLocalDate(new Date(openUVRequest.data.result.sun_info.sun_times.nadir)), true);
                await adapter.setStateAsync('sun_info.sun_times.sunrise', convertUTCDateToLocalDate(new Date(openUVRequest.data.result.sun_info.sun_times.sunrise)), true);
                await adapter.setStateAsync('sun_info.sun_times.sunset', convertUTCDateToLocalDate(new Date(openUVRequest.data.result.sun_info.sun_times.sunset)), true);
                await adapter.setStateAsync('sun_info.sun_times.sunriseEnd', convertUTCDateToLocalDate(new Date(openUVRequest.data.result.sun_info.sun_times.sunriseEnd)), true);
                await adapter.setStateAsync('sun_info.sun_times.sunsetStart', convertUTCDateToLocalDate(new Date(openUVRequest.data.result.sun_info.sun_times.sunsetStart)), true);
                await adapter.setStateAsync('sun_info.sun_times.dawn', convertUTCDateToLocalDate(new Date(openUVRequest.data.result.sun_info.sun_times.dawn)), true);
                await adapter.setStateAsync('sun_info.sun_times.dusk', convertUTCDateToLocalDate(new Date(openUVRequest.data.result.sun_info.sun_times.dusk)), true);
                await adapter.setStateAsync('sun_info.sun_times.nauticalDawn', convertUTCDateToLocalDate(new Date(openUVRequest.data.result.sun_info.sun_times.nauticalDawn)), true);
                await adapter.setStateAsync('sun_info.sun_times.nauticalDusk', convertUTCDateToLocalDate(new Date(openUVRequest.data.result.sun_info.sun_times.nauticalDusk)), true);
                await adapter.setStateAsync('sun_info.sun_times.nightEnd', openUVRequest.data.result.sun_info.sun_times.nightEnd ? convertUTCDateToLocalDate(new Date(openUVRequest.data.result.sun_info.sun_times.nightEnd)) : '', true);
                await adapter.setStateAsync('sun_info.sun_times.night', openUVRequest.data.result.sun_info.sun_times.night ? convertUTCDateToLocalDate(new Date(openUVRequest.data.result.sun_info.sun_times.night)) : '', true);
                await adapter.setStateAsync('sun_info.sun_times.goldenHourEnd', convertUTCDateToLocalDate(new Date(openUVRequest.data.result.sun_info.sun_times.goldenHourEnd)), true);
                await adapter.setStateAsync('sun_info.sun_times.goldenHour', convertUTCDateToLocalDate(new Date(openUVRequest.data.result.sun_info.sun_times.goldenHour)), true);

                // set State for safe sun position
                const azimuth = openUVRequest.data.result.sun_info.sun_position.azimuth * 180 / Math.PI + 180;
                const altitude = openUVRequest.data.result.sun_info.sun_position.altitude * 180 / Math.PI;
                await adapter.setStateAsync('sun_info.sun_position.azimuth', Math.round(10 * azimuth) / 10, true);
                await adapter.setStateAsync('sun_info.sun_position.altitude', Math.round(10 * altitude) / 10, true);

                // set State for safe exposure time
                await adapter.setStateAsync('safe_exposure_time.st1', openUVRequest.data.result.safe_exposure_time.st1, true);
                await adapter.setStateAsync('safe_exposure_time.st2', openUVRequest.data.result.safe_exposure_time.st2, true);
                await adapter.setStateAsync('safe_exposure_time.st3', openUVRequest.data.result.safe_exposure_time.st3, true);
                await adapter.setStateAsync('safe_exposure_time.st4', openUVRequest.data.result.safe_exposure_time.st4, true);
                await adapter.setStateAsync('safe_exposure_time.st5', openUVRequest.data.result.safe_exposure_time.st5, true);
                await adapter.setStateAsync('safe_exposure_time.st6', openUVRequest.data.result.safe_exposure_time.st6, true);

                // UV Level
                const uvLevel = openUVRequest.data.result.uv;

                if (uvLevel <= 2.99) {
                    await adapter.setStateAsync('uv_level', tools._('low', systemLang), true);
                    await adapter.setStateAsync('uv_warn', false, true);
                    await adapter.setStateAsync('uv_alert', false, true);
                } else
                    if (uvLevel > 2.99 && uvLevel <= 5.99) {
                        await adapter.setStateAsync('uv_level', tools._('moderate', systemLang), true);
                        await adapter.setStateAsync('uv_warn', false, true);
                        await adapter.setStateAsync('uv_alert', false, true);
                    } else
                        if (uvLevel > 5.99 && uvLevel <= 7.99) {
                            await adapter.setStateAsync('uv_level', tools._('high', systemLang), true);
                            await adapter.setStateAsync('uv_warn', true, true);
                            await adapter.setStateAsync('uv_alert', false, true);
                        } else
                            if (uvLevel > 7.99 && uvLevel <= 10.99) {
                                await adapter.setStateAsync('uv_level', tools._('very high', systemLang), true);
                                await adapter.setStateAsync('uv_warn', true, true);
                                await adapter.setStateAsync('uv_alert', true, true);
                            } else
                                if (uvLevel > 10.99) {
                                    await adapter.setStateAsync('uv_level', tools._('extreme', systemLang), true);
                                    await adapter.setStateAsync('uv_warn', true, true);
                                    await adapter.setStateAsync('uv_alert', true, true);
                                }

                adapter.log.debug('API Request done');
            } else {
                adapter.log.warn('API is not reachable');
            }
        } catch (err) {
            adapter.log.warn('Request error: ' + err);
        }
        // @ts-ignore
        resolve();
    });
}

async function main() {
    await getSystemData();

    if (adapter.config.apiKey && longitude && latitude) {
        adapter.getForeignObjectAsync('system.config', async (err, obj) => {
            await requestAPI();
            stopTimer = setTimeout(() => adapter.stop(), 6000);
        });
    } else {
        adapter.log.warn('system settings cannot be called up. Please check configuration!');
        stopTimer = setTimeout(() => adapter.stop(), 6000);
    }
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export startAdapter in compact mode
    module.exports = startAdapter;
} else {
    // otherwise start the instance directly
    startAdapter();
}
