import prom from 'prom-client';
import express from 'express';

const emailCounter = new prom.Counter({
    name: 'email_counter',
    help: 'Nombre de mails traités'
});

const inboundEmailSize = new prom.Histogram({
    name: 'inbound_email_size',
    help: 'Poids total des mails entrants',
    buckets: [0.1, 5, 10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000, 500000]
});

const ountboundEmailSize = new prom.Histogram({
    name: 'outbound_email_size',
    help: 'Poids total des mails sortants',
    buckets: [0.1, 5, 10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000, 500000]
});

const visitedMetrics = new prom.Counter({
    name: 'test_counter',
    help: 'Test de métrique'
});

prom.register.registerMetric(visitedMetrics);

export function incrementEmailCounter() {
    emailCounter.inc();
}

export function observeInbound(size) {
    inboundEmailSize.observe(size);
}

export function observeOutbound(size) {
    ountboundEmailSize.observe(size);
}

export function createServer() {
    const app = express();

    app.get('/metrics', async (req, res) => {
        visitedMetrics.inc();
        res.set('Content-Type', prom.register.contentType);
        res.send(await prom.register.metrics());
    });

    return app;
}