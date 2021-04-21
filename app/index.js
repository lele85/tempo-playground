const opentelemetry = require('@opentelemetry/api');
const { ConsoleSpanExporter, SimpleSpanProcessor, BasicTracerProvider } = require('@opentelemetry/tracing');
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');

const provider = new BasicTracerProvider();
const exporterConsole = new ConsoleSpanExporter();
const exporterZipkin = new ZipkinExporter({url:"http://localhost:9411", serviceName: 'index'});

provider.addSpanProcessor(new SimpleSpanProcessor(exporterZipkin));
provider.addSpanProcessor(new SimpleSpanProcessor(exporterConsole));
provider.register();

const tracer = opentelemetry.trace.getTracer('default');

const rand = () => {
    return Math.round(Math.random() * 100);
}

const sleep = (ms)  => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        }, ms);
    })
}

async function doWork(ms, ctx) {
    const span = tracer.startSpan(`doWork`,{
        attributes: {
            duration: ms
        }
    }, ctx);
    await sleep(ms);
    span.end();
}

(async function() {
    const root = tracer.startSpan('main');
    let ctx = opentelemetry.setSpan(opentelemetry.context.active(), root);

    const waterfall = tracer.startSpan("waterfall", {}, ctx);
    ctx = opentelemetry.setSpan(opentelemetry.context.active(), waterfall);
    await doWork(rand(), ctx);
    await doWork(rand(), ctx);
    await doWork(rand(), ctx);
    waterfall.end();

    ctx = opentelemetry.setSpan(opentelemetry.context.active(), root);
    const parallel = tracer.startSpan("parallel", {}, ctx);
    ctx = opentelemetry.setSpan(opentelemetry.context.active(), parallel);
    await Promise.all([
        doWork(rand(), ctx),
        doWork(rand(), ctx),
        doWork(rand(), ctx)
    ]);
    parallel.end();
    
    ctx = opentelemetry.setSpan(opentelemetry.context.active(), root);
    const race = tracer.startSpan("race", {}, ctx);
    ctx = opentelemetry.setSpan(opentelemetry.context.active(), race);
    await Promise.race([
        doWork(rand(), ctx),
        doWork(rand(), ctx),
        doWork(rand(), ctx)
    ]);
    race.end();

    root.end();

    await exporterConsole.shutdown();
    await exporterZipkin.shutdown();
    await provider.shutdown();
}());
