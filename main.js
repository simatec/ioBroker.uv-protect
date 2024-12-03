'use strict';

// @ts-ignore
const utils = require('@iobroker/adapter-core');
// @ts-ignore
const axios = require('axios');
const tools = require('./lib/tools');

let longitude;
let latitude;
let stopTimer;

let systemLang = 'de'; // system language

let adapter;
const adapterName = require('./package.json').name.split('.').pop();

/**
 * Starts the adapter instance
 *
 * @param {Partial<ioBroker.AdapterOptions>} [options]
 */

function startAdapter(options) {

    options = options || {};
    Object.assign(options, { name: adapterName, useFormatDate: true, });

    // @ts-ignore
    adapter = new utils.Adapter(options);

    adapter.on('ready', main);

    adapter.on('unload', (callback) => {
        try {
            clearTimeout(stopTimer);
            callback();
        } catch (e) {
            callback();
        }
    });

    return adapter;
}

function getSystemData() {
    // @ts-ignore
    return new Promise(async (resolve, reject) => {
        try {
            const obj = await adapter.getForeignObjectAsync('system.config');

            if (obj) {
                systemLang = obj.common.language;
                adapter.log.debug(`System language: ${systemLang}`);

                if (adapter.config.systemGeoData) {
                    longitude = obj.common.longitude;
                    latitude = obj.common.latitude;
                    adapter.log.debug(`System longitude: ${longitude} System latitude: ${latitude}`);
                } else {
                    longitude = adapter.config.longitude;
                    latitude = adapter.config.latitude;
                    adapter.log.debug(`longitude: ${longitude} latitude: ${latitude}`);
                }

                // @ts-ignore
                resolve();
            } else {
                adapter.log.error('system settings cannot be called up. Please check configuration!');
                // @ts-ignore
                resolve();
            }
        } catch (err) {
            adapter.log.warn('system settings cannot be called up. Please check configuration!');
            reject();
        }
    });
}

async function requestAPI() {
    // @ts-ignore
    return new Promise(async (resolve) => {
        try {
            adapter.log.debug('API Request started ...');

            const openUVURL = 'https://api.openuv.io/api/v1/uv';

            // @ts-ignore
            const openUVRequest = await axios({
                method: 'get',
                url: openUVURL,
                timeout: 5000,
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
                await adapter.setStateAsync('uv_time', new Date(openUVRequest.data.result.uv_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), true);
                await adapter.setStateAsync('uv_max', Math.round(openUVRequest.data.result.uv_max * 100) / 100, true);
                await adapter.setStateAsync('uv_max_time', new Date(openUVRequest.data.result.uv_max_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), true);
                await adapter.setStateAsync('ozone', openUVRequest.data.result.ozone, true);
                await adapter.setStateAsync('ozone_time', new Date(openUVRequest.data.result.ozone_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), true);

                // created json
                let json = ({
                    uv: Math.round(openUVRequest.data.result.uv * 100) / 100,
                    uv_time: new Date(openUVRequest.data.result.uv_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    uv_max: Math.round(openUVRequest.data.result.uv_max * 100) / 100,
                    uv_max_time: new Date(openUVRequest.data.result.uv_max_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    ozone: openUVRequest.data.result.ozone,
                    ozone_time: new Date(openUVRequest.data.result.ozone_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });

                await adapter.setStateAsync('uv_json', JSON.stringify(json), true);

                // set State for safe sun times
                await adapter.setStateAsync('sun_info.sun_times.solarNoon', new Date(openUVRequest.data.result.sun_info.sun_times.solarNoon).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), true);
                await adapter.setStateAsync('sun_info.sun_times.nadir', new Date(openUVRequest.data.result.sun_info.sun_times.nadir).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), true);
                await adapter.setStateAsync('sun_info.sun_times.sunrise', new Date(openUVRequest.data.result.sun_info.sun_times.sunrise).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), true);
                await adapter.setStateAsync('sun_info.sun_times.sunset', new Date(openUVRequest.data.result.sun_info.sun_times.sunset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), true);
                await adapter.setStateAsync('sun_info.sun_times.sunriseEnd', new Date(openUVRequest.data.result.sun_info.sun_times.sunriseEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), true);
                await adapter.setStateAsync('sun_info.sun_times.sunsetStart', new Date(openUVRequest.data.result.sun_info.sun_times.sunsetStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), true);
                await adapter.setStateAsync('sun_info.sun_times.dawn', new Date(openUVRequest.data.result.sun_info.sun_times.dawn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), true);
                await adapter.setStateAsync('sun_info.sun_times.dusk', new Date(openUVRequest.data.result.sun_info.sun_times.dusk).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), true);
                await adapter.setStateAsync('sun_info.sun_times.nauticalDawn', new Date(openUVRequest.data.result.sun_info.sun_times.nauticalDawn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), true);
                await adapter.setStateAsync('sun_info.sun_times.nauticalDusk', new Date(openUVRequest.data.result.sun_info.sun_times.nauticalDusk).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), true);
                await adapter.setStateAsync('sun_info.sun_times.nightEnd', openUVRequest.data.result.sun_info.sun_times.nightEnd ? new Date(openUVRequest.data.result.sun_info.sun_times.nightEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '', true);
                await adapter.setStateAsync('sun_info.sun_times.night', openUVRequest.data.result.sun_info.sun_times.night ? new Date(openUVRequest.data.result.sun_info.sun_times.night).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '', true);
                await adapter.setStateAsync('sun_info.sun_times.goldenHourEnd', new Date(openUVRequest.data.result.sun_info.sun_times.goldenHourEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), true);
                await adapter.setStateAsync('sun_info.sun_times.goldenHour', new Date(openUVRequest.data.result.sun_info.sun_times.goldenHour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), true);

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
            adapter.log.warn(`Request error: ${err}`);
        }
        // @ts-ignore
        resolve();
    });
}

async function main() {
    await getSystemData();

    if (adapter.config.apiKey && longitude && latitude) {
        const obj = await adapter.getForeignObjectAsync('system.config');

        if (obj) {
            await requestAPI();
            stopTimer = setTimeout(async () => adapter.stop(), 6000);
        }
    } else {
        adapter.log.warn('system settings cannot be called up. Please check configuration!');
        stopTimer = setTimeout(async () => adapter.stop(), 6000);
    }
}

// @ts-expect-error parent is a valid property on module
if (module.parent) {
    // Export startAdapter in compact mode
    module.exports = startAdapter;
} else {
    // otherwise start the instance directly
    startAdapter();
}
