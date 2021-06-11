const { ConsoleSpanExporter, SimpleSpanProcessor } = require('@opentelemetry/tracing');
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { NodeTracerProvider } = require('@opentelemetry/node');
const { AsyncHooksContextManager } = require('@opentelemetry/context-async-hooks');
const { context, setSpan, SpanStatusCode } = require('@opentelemetry/api');
const { toZipkinSpan } = require('@opentelemetry/exporter-zipkin/build/src/transform');



const contextManager = new AsyncHooksContextManager();
context.setGlobalContextManager(contextManager.enable());
class MyExporter {
    /**
     * Export spans.
     * @param spans
     * @param resultCallback
     */
    export(spans, resultCallback){
        console.log(`ZIPKIN ${JSON.stringify(spans.map((span) => {return toZipkinSpan(span,"index", "status.status_code", "status.status_description")}))}`);
    }
    /**
     * Shutdown the exporter.
     */
    shutdown() {

    }
}

const provider = new NodeTracerProvider();
const exporterConsole = new ConsoleSpanExporter();
const exporterZipkinConsole = new MyExporter();
const exporterZipkin = new ZipkinExporter({
    url:"http://localhost:9411",
    serviceName: 'index',
    statusCodeTagName: "status.status_code",
    statusDescriptionTagName: "status.status_description"
});


provider.addSpanProcessor(new SimpleSpanProcessor(exporterConsole));
provider.addSpanProcessor(new SimpleSpanProcessor(exporterZipkin));
provider.addSpanProcessor(new SimpleSpanProcessor(exporterZipkinConsole));
provider.register();

registerInstrumentations({
    tracerProvider: provider,
  });

const tracer = provider.getTracer('default');


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

function setSpanStatus (span, status) {
    span.setStatus(status);
    switch(status.code) {
        case SpanStatusCode.ERROR:
            span.setAttribute("error", true);
            break;
        case SpanStatusCode.UNSET:
        case SpanStatusCode.OK:
            span.setAttribute("error", null);
            break;

    }
}


async function doWork(ms) {
    const span = tracer.startSpan(`doWork`,{
        attributes: {
            duration: ms
        }
    });
    await sleep(ms);
    setSpanStatus(span, {code: SpanStatusCode.ERROR, message: "Error"});
    span.end();
}

(async function() {
    const root = tracer.startSpan('main');
    await context.with(setSpan(context.active(), root), async () => {
        const waterfall = tracer.startSpan("waterfall");
        await context.with(setSpan(context.active(), waterfall), async () => {
            await doWork(rand());
            await doWork(rand());
            await doWork(rand());
        });
        waterfall.end();
    
        const parallel = tracer.startSpan("parallel");
        await context.with(setSpan(context.active(), parallel), async () => {
            await Promise.all([
                doWork(rand()),
                doWork(rand()),
                doWork(rand())
            ]);
        });
        parallel.end();

        const race = tracer.startSpan("race");
        await context.with(setSpan(context.active(), race), async () => {
            await Promise.race([
                doWork(rand()),
                doWork(rand()),
                doWork(rand())
            ]);
        })
        race.end();
    });

    root.end();

    await exporterConsole.shutdown();
    await exporterZipkin.shutdown();
    await exporterZipkinConsole.shutdown();
    await provider.shutdown();
}());
