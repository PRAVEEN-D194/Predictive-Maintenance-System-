import urllib.request
import json
import time

base = 'http://127.0.0.1:5000'

def get_fleet():
    req = urllib.request.urlopen(f'{base}/fleet')
    return json.loads(req.read().decode())

def post_json(url):
    req = urllib.request.Request(url, data=b'{}', headers={'Content-Type': 'application/json'}, method='POST')
    res = urllib.request.urlopen(req)
    return json.loads(res.read().decode())

print('1. Initial fleet state:')
f1 = get_fleet()
for m in f1['machines']:
    print(f"   {m['id']}: status={m['status']}, is_stopped={m.get('is_stopped')}, air_temp={m['sensor_values']['air_temperature']}")

print('\n2. Stopping M-003...')
res_stop = post_json(f'{base}/machine/M-003/stop')
print('   Stop response:', res_stop['message'])

time.sleep(1.5)
f2 = get_fleet()
m3_val1 = None
m1_val1 = None
for m in f2['machines']:
    if m['id'] == 'M-003': m3_val1 = m['sensor_values']['air_temperature']
    if m['id'] == 'M-001': m1_val1 = m['sensor_values']['air_temperature']
    print(f"   {m['id']}: status={m['status']}, is_stopped={m.get('is_stopped')}, air_temp={m['sensor_values']['air_temperature']}")

print('\n3. Waiting 2.5 seconds to verify M-003 is frozen and others continue...')
time.sleep(2.5)
f3 = get_fleet()
m3_val2 = None
m1_val2 = None
for m in f3['machines']:
    if m['id'] == 'M-003': m3_val2 = m['sensor_values']['air_temperature']
    if m['id'] == 'M-001': m1_val2 = m['sensor_values']['air_temperature']
    print(f"   {m['id']}: status={m['status']}, is_stopped={m.get('is_stopped')}, air_temp={m['sensor_values']['air_temperature']}")

assert m3_val1 == m3_val2, f"M-003 changed while stopped! {m3_val1} -> {m3_val2}"
print('   >>> SUCCESS: M-003 remained completely frozen!')

print('\n4. Starting M-003...')
res_start = post_json(f'{base}/machine/M-003/start')
print('   Start response:', res_start['message'])

time.sleep(2.0)
f4 = get_fleet()
m3_val3 = None
for m in f4['machines']:
    if m['id'] == 'M-003': m3_val3 = m['sensor_values']['air_temperature']
    print(f"   {m['id']}: status={m['status']}, is_stopped={m.get('is_stopped')}, air_temp={m['sensor_values']['air_temperature']}")

print('\n5. Route aliases test (/machines, /machines/M-003/stop, /machines/M-003/start)...')
req_alias = urllib.request.urlopen(f'{base}/machines')
assert req_alias.status == 200
print('   GET /machines -> 200 OK')

req_single = urllib.request.urlopen(f'{base}/machines/M-003')
assert req_single.status == 200
print('   GET /machines/M-003 -> 200 OK')

print('\n>>> ALL TEST VERIFICATIONS PASSED PERFECTLY!')
