const { ConsoleSpanExporter, SimpleSpanProcessor } = require('@opentelemetry/tracing');
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { NodeTracerProvider } = require('@opentelemetry/node');
const { AsyncHooksContextManager } = require('@opentelemetry/context-async-hooks');
const { context, setSpan } = require('@opentelemetry/api');

const contextManager = new AsyncHooksContextManager();
context.setGlobalContextManager(contextManager.enable());

const provider = new NodeTracerProvider();
const exporterConsole = new ConsoleSpanExporter();
const exporterZipkin = new ZipkinExporter({url:"http://localhost:9411", serviceName: 'index'});

provider.addSpanProcessor(new SimpleSpanProcessor(exporterZipkin));
provider.addSpanProcessor(new SimpleSpanProcessor(exporterConsole));
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

async function doWork(ms) {
    const span = tracer.startSpan(`doWork`,{
        attributes: {
            duration: ms
        }
    });
    await sleep(ms);
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
    await provider.shutdown();
}());
