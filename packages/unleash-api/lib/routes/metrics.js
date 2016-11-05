'use strict';

const logger = require('../logger');
const ClientMetrics = require('../client-metrics');
const ClientMetricsService = require('../client-metrics/service');

module.exports = function (app, config) {
    const {
        clientMetricsStore,
        clientStrategyStore,
        clientInstanceStore,
    } = config.stores;
    const metrics = new ClientMetrics();
    const service = new ClientMetricsService(clientMetricsStore);

    service.on('metrics', (entries) => {
        entries.forEach((m) => {
            metrics.addPayload(m.metrics);
        });
    });

    app.get('/metrics', (req, res) => {
        res.json(metrics.getMetricsOverview());
    });

    app.get('/metrics/features', (req, res) => {
        res.json(metrics.getTogglesMetrics());
    });

    app.post('/client/metrics', (req, res) => {
        try {
            const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            service
                .insert(data)
                .catch(e => logger.error('Error inserting metrics data', e));
        } catch (e) {
            logger.error('Error receiving metrics', e);
        }

        res.end();
    });

    app.post('/client/register', (req, res) => {
        const data = req.body;
        const clientIp = req.ip;
        clientStrategyStore.insert(data.appName, data.strategies)
            .then(() => clientStrategyStore.insert({
                appName: data.appName,
                instanceId: data.instanceId,
                clientIp,
            }))
            .then(() => console.log('new client registerd'))
            .catch((error) => logger.error('Error registering client', error));

        res.end();
    });

    app.get('/client/strategies', (req, res) => {
        clientStrategyStore.getAll().then(data => res.json(data));
    });

    app.get('/client/instances', (req, res) => {
        clientInstanceStore.getAll()
            .then(data => res.json(data))
            .catch(err => console.error(err));
    });
};