/*!
  @title Home Assistant
  @version 1.0
  @author svbnet
 */
System.include('com.philips.HttpLibrary.js');
System.include('json.js');

type HttpCallback = (resp: object | string, error?: Error) => void;

const homeAssistant = ((() => {
  class HomeAssistantClient {
    readonly url: string;
    readonly authToken: string;

    constructor(url: string, authToken: string) {
      this.url = url;
      this.authToken = authToken;
    }

    private performJsonRequest(path: string, method: 'GET' | 'POST', callback: HttpCallback) {
      const client = new com.philips.HttpLibrary.HttpRequest();
      client.open(method, `${this.url}/api/${path}`, true);
      client.onreadystatechange = () => {
        if (client.readyState !== 4) return;
        try {
          if (client.status >= 200 && client.status <= 299) {
            const json = JSON.parse(client.responseText);
            callback(json);
          } else {
            callback(client.responseText, new Error(`Unexpected response code ${client.status}`));
          }
        } catch (e) {
          callback(client.responseText, e);
        }
      };
      client.setRequestHeader('Authorization', `Bearer ${this.authToken}`);
      client.setRequestHeader('User-Agent', 'Pronto Home Assistant/1.0');

      client.send(null);
    }

    getApiStatus(callback: HttpCallback) {
      this.performJsonRequest('', 'GET', callback);
    }

    getStates(callback: HttpCallback) {
      this.performJsonRequest('states', 'GET', callback);
    }
  }
 
  let _ha: HomeAssistantClient;

  const _s = {
    currentState: undefined as (Record<string, unknown>[] | undefined),

    getClient(): HomeAssistantClient {
      if (_ha) return _ha;

      const url = System.getGlobal('HA_URL');
      const authToken = System.getGlobal('HA_AUTH_TOKEN');
      if (!url || !authToken) {
        GUI.alert('URL or auth token is missing!');
      }

      _ha = new HomeAssistantClient(url, authToken);
      return _ha;
    },

    refreshStates(callback: (error?: Error) => void) {
      _s.getClient().getStates((resp: object | string, error?: Error) => {
        if (error) { 
          callback(error);
          return;
        }

        if (resp instanceof Array) {
          _s.currentState = resp;
        }
        callback();
      });
    },

    findEntityStates(entityId: string): Record<string, unknown>[] {
      if (!_s.currentState) return [];

      const entities = _s.currentState.filter((e) => (e.entity_id === entityId));
      return entities;
    }
  };

  return _s;
})());
