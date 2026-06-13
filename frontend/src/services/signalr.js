
import * as signalR from '@microsoft/signalr';

let connection = null;
const listeners = new Set();
const dashboardListeners = new Set();

export const initSignalR = (userId, role) => {
  if (connection && connection.state !== signalR.HubConnectionState.Disconnected) {
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) return;

  connection = new signalR.HubConnectionBuilder()
    .withUrl('http://localhost:5031/hubs/notifications', {
      accessTokenFactory: () => token
    })
    .withAutomaticReconnect()
    .build();

  connection.on('ReceiveNotification', (notification) => {
    listeners.forEach(cb => cb(notification));
  });

  connection.on('DashboardUpdated', () => {
    dashboardListeners.forEach(cb => cb());
  });

  connection.start()
    .then(() => {
      console.log('SignalR Connected.');
      // Register user and role groups
      connection.invoke('RegisterUser', userId.toString()).catch(err => console.error(err));
      connection.invoke('RegisterRole', role).catch(err => console.error(err));
    })
    .catch(err => {
      console.error('SignalR Connection Error: ', err);
    });
};

export const stopSignalR = () => {
  if (connection) {
    connection.stop().then(() => {
      connection = null;
      console.log('SignalR Disconnected.');
    });
  }
};

export const subscribeToNotifications = (callback) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};

export const subscribeToDashboardUpdates = (callback) => {
  dashboardListeners.add(callback);
  return () => {
    dashboardListeners.delete(callback);
  };
};
