'use strict';


// @ts-ignore
const utils = require('@iobroker/adapter-core');
// @ts-ignore
const axios = require('axios').default;

let longitude;
let latitude;
let stopTimer;

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
    return new Promise(async (resolve, reject) => {
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
                        adapter.log.info('System longitude: ' + state.common.longitude + ' System latitude: ' + state.common.latitude);
                        // @ts-ignore
                        resolve();
                    }
                });
            } catch (err) {
                adapter.log.warn('Astro data from the system settings cannot be called up. Please check configuration!')
                // @ts-ignore
                resolve();
            }
        } else {
            try {
                longitude = adapter.config.longitude;
                latitude = adapter.config.latitude;
                adapter.log.info('longitude: ' + adapter.config.longitude + ' latitude: ' + adapter.config.latitude);
                // @ts-ignore
                resolve();
            } catch (err) {
                adapter.log.warn('Astro data from the system settings cannot be called up. Please check configuration!')
                // @ts-ignore
                resolve();
            }
        }
    });
}

function getDate(d) {
    d = d || new Date();

    return d.getFullYear() + '-' +
        ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
        ('0' + d.getDate()).slice(-2) + 'T' +
        ('0' + d.getHours()).slice(-2) + ':' +
        ('0' + d.getMinutes()).slice(-2) + ':' +
        ('0' + d.getSeconds()).slice(-2) + 'Z';
}

async function requestAPI(secret) {
    // @ts-ignore
    return new Promise(async (resolve, reject) => {
        try {
            adapter.log.info('API Request started ...');

            const openUVURL = 'https://api.openuv.io/api/v1/uv';

            const openUVRequest = await axios({
                method: 'get',
                baseURL: openUVURL,
                params: {
                    lat: latitude,
                    lng: longitude,
                    dt: getDate()
                },
                headers: {
                    'x-access-token': adapter.config.apiKey
                },
                responseType: 'json'
            });

            if (openUVRequest.data && openUVRequest.data.result) {
                adapter.log.info('API Request successfully completed');

                // set State for uv and ozone
                await adapter.setStateAsync('uv', openUVRequest.data.result.uv, true);
                await adapter.setStateAsync('uv_time', openUVRequest.data.result.uv_time, true);
                await adapter.setStateAsync('uv_max', openUVRequest.data.result.uv_max, true);
                await adapter.setStateAsync('uv_max_time', openUVRequest.data.result.uv_max_time, true);
                await adapter.setStateAsync('ozone', openUVRequest.data.result.ozone, true);
                await adapter.setStateAsync('ozone_time', openUVRequest.data.result.ozone_time, true);

                // created json
                let json = ({
                    "uv": openUVRequest.data.result.uv,
                    "uv_time": openUVRequest.data.result.uv_time,
                    "uv_max": openUVRequest.data.result.uv_max,
                    "uv_max_time": openUVRequest.data.result.uv_max_time,
                    "ozone": openUVRequest.data.result.ozone,
                    "ozone_time": openUVRequest.data.result.ozone_time
                });

                await adapter.setStateAsync('uv_json', JSON.stringify(json), true);

                // set State for safe sun times
                await adapter.setStateAsync('sun_info.sun_times.solarNoon', openUVRequest.data.result.sun_info.sun_times.solarNoon, true);
                await adapter.setStateAsync('sun_info.sun_times.nadir', openUVRequest.data.result.sun_info.sun_times.nadir, true);
                await adapter.setStateAsync('sun_info.sun_times.sunrise', openUVRequest.data.result.sun_info.sun_times.sunrise, true);
                await adapter.setStateAsync('sun_info.sun_times.sunset', openUVRequest.data.result.sun_info.sun_times.sunset, true);
                await adapter.setStateAsync('sun_info.sun_times.sunriseEnd', openUVRequest.data.result.sun_info.sun_times.sunriseEnd, true);
                await adapter.setStateAsync('sun_info.sun_times.sunsetStart', openUVRequest.data.result.sun_info.sun_times.sunsetStart, true);
                await adapter.setStateAsync('sun_info.sun_times.dawn', openUVRequest.data.result.sun_info.sun_times.dawn, true);
                await adapter.setStateAsync('sun_info.sun_times.dusk', openUVRequest.data.result.sun_info.sun_times.dusk, true);
                await adapter.setStateAsync('sun_info.sun_times.nauticalDawn', openUVRequest.data.result.sun_info.sun_times.nauticalDawn, true);
                await adapter.setStateAsync('sun_info.sun_times.nauticalDusk', openUVRequest.data.result.sun_info.sun_times.nauticalDusk, true);
                await adapter.setStateAsync('sun_info.sun_times.nightEnd', openUVRequest.data.result.sun_info.sun_times.nightEnd, true);
                await adapter.setStateAsync('sun_info.sun_times.night', openUVRequest.data.result.sun_info.sun_times.night, true);
                await adapter.setStateAsync('sun_info.sun_times.goldenHourEnd', openUVRequest.data.result.sun_info.sun_times.goldenHourEnd, true);
                await adapter.setStateAsync('sun_info.sun_times.goldenHour', openUVRequest.data.result.sun_info.sun_times.goldenHour, true);

                // set State for safe sun position
                await adapter.setStateAsync('sun_info.sun_position.azimuth', openUVRequest.data.result.sun_info.sun_position.azimuth, true);
                await adapter.setStateAsync('sun_info.sun_position.altitude', openUVRequest.data.result.sun_info.sun_position.altitude, true);

                // set State for safe exposure time
                await adapter.setStateAsync('safe_exposure_time.st1', openUVRequest.data.result.safe_exposure_time.st1, true);
                await adapter.setStateAsync('safe_exposure_time.st2', openUVRequest.data.result.safe_exposure_time.st2, true);
                await adapter.setStateAsync('safe_exposure_time.st3', openUVRequest.data.result.safe_exposure_time.st3, true);
                await adapter.setStateAsync('safe_exposure_time.st4', openUVRequest.data.result.safe_exposure_time.st4, true);
                await adapter.setStateAsync('safe_exposure_time.st5', openUVRequest.data.result.safe_exposure_time.st5, true);
                await adapter.setStateAsync('safe_exposure_time.st6', openUVRequest.data.result.safe_exposure_time.st6, true);

                // UV Level
                const uvLevel = openUVRequest.data.result.uv;

                if (uvLevel <= 2) {
                    await adapter.setStateAsync('uv_level', 'low', true);
                    await adapter.setStateAsync('uv_warn', false, true);
                    await adapter.setStateAsync('uv_alert', false, true);
                } else
                    if (uvLevel > 2 && uvLevel <= 5) {
                        await adapter.setStateAsync('uv_level', 'moderate', true);
                        await adapter.setStateAsync('uv_warn', false, true);
                        await adapter.setStateAsync('uv_alert', false, true);
                    } else
                        if (uvLevel > 5 && uvLevel <= 7) {
                            await adapter.setStateAsync('uv_level', 'high', true);
                            await adapter.setStateAsync('uv_warn', true, true);
                            await adapter.setStateAsync('uv_alert', false, true);
                        } else
                            if (uvLevel > 7 && uvLevel <= 10) {
                                await adapter.setStateAsync('uv_level', 'very high', true);
                                await adapter.setStateAsync('uv_warn', true, true);
                                await adapter.setStateAsync('uv_alert', true, true);
                            } else
                                if (uvLevel > 10) {
                                    await adapter.setStateAsync('uv_level', 'extreme', true);
                                    await adapter.setStateAsync('uv_warn', true, true);
                                    await adapter.setStateAsync('uv_alert', true, true);
                                }

                adapter.log.info('API Request done')
            } else {
                adapter.log.warn('API is not reachable')
            }
        } catch (err) {
            adapter.log.warn('Request error: ' + err)
        }
        // @ts-ignore
        resolve();
    });
}

async function main() {
    await getSystemData();

    if (adapter.config.apiKey && longitude && latitude) {
        adapter.getForeignObjectAsync('system.config', async (err, obj) => {
            await requestAPI((obj && obj.native && obj.native.secret) || 'Zgfr56gFe87jJOM');
            stopTimer = setTimeout(() => adapter.stop(), 6000);
        });
    } else {
        adapter.log.warn('system settings cannot be called up. Please check configuration!')
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
