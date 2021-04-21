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
    const span = tracer.startSpan('main');
    const ctx = opentelemetry.setSpan(opentelemetry.context.active(), span);

    await doWork(10, ctx);
    await doWork(20, ctx);
    await doWork(30, ctx)
    await Promise.all([
        doWork(40,ctx),
        doWork(50,ctx),
        doWork(60,ctx)
    ])
    span.end();

    await exporterConsole.shutdown();
    await exporterZipkin.shutdown();
    await provider.shutdown();
}());
