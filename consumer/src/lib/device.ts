export function getDeviceUUID(): string {
  let uuid = localStorage.getItem('device_uuid');
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem('device_uuid', uuid);
  }
  return uuid;
}
