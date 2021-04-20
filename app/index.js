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

(async function() {
    const span = tracer.startSpan('main');    
    await sleep(1000);
    span.end();
    await exporterConsole.shutdown();
    await exporterZipkin.shutdown();
    await provider.shutdown();
}());
