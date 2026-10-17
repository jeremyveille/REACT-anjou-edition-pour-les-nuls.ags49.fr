import * as serviceWorkerRegistration from './serviceWorkerRegistration';

describe('serviceWorkerRegistration', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalServiceWorker = navigator.serviceWorker;

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    Object.defineProperty(navigator, 'serviceWorker', {
      value: originalServiceWorker,
      writable: true,
      configurable: true
    });
  });

  it('does not throw when navigator.serviceWorker is undefined', () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      writable: true,
      configurable: true
    });

    expect(() => {
      serviceWorkerRegistration.register();
      serviceWorkerRegistration.unregister();
    }).not.toThrow();
  });

  it('calls navigator.serviceWorker.ready.then to unregister', async () => {
    const mockUnregister = jest.fn().mockResolvedValue(true);
    const mockReady = Promise.resolve({
      unregister: mockUnregister
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: mockReady
      },
      writable: true,
      configurable: true
    });

    serviceWorkerRegistration.unregister();
    await mockReady;
    expect(mockUnregister).toHaveBeenCalled();
  });

  it('registers service worker when window loads in production', () => {
    process.env.NODE_ENV = 'production';
    const mockRegister = jest.fn().mockReturnValue(new Promise(() => {}));

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: mockRegister
      },
      writable: true,
      configurable: true
    });

    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    serviceWorkerRegistration.register();

    expect(addEventListenerSpy).toHaveBeenCalledWith('load', expect.any(Function));
    addEventListenerSpy.mockRestore();
  });

  it('handles controllerchange gracefully without reloading on initial activation', () => {
    let controllerChangeHandler = null;
    const addEventListenerMock = jest.fn((event, handler) => {
      if (event === 'controllerchange') {
        controllerChangeHandler = handler;
      }
    });

    const originalLocation = window.location;
    delete window.location;
    window.location = {
      href: 'http://localhost/',
      origin: 'http://localhost',
      hostname: 'localhost',
      reload: jest.fn()
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        controller: null,
        addEventListener: addEventListenerMock
      },
      writable: true,
      configurable: true
    });

    serviceWorkerRegistration.register();

    expect(addEventListenerMock).toHaveBeenCalledWith('controllerchange', expect.any(Function));
    expect(controllerChangeHandler).toBeInstanceOf(Function);

    // Première activation (prise de contrôle initiale) : pas de rechargement
    controllerChangeHandler();
    expect(window.location.reload).not.toHaveBeenCalled();

    // Deuxième activation (mise à jour) : rechargement déclenché
    controllerChangeHandler();
    expect(window.location.reload).toHaveBeenCalledTimes(1);

    window.location = originalLocation;
  });
});
