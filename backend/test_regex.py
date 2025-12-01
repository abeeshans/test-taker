import re

origin_regex = r"^(http://(localhost|127\.0\.0\.1)(:\d+)?|https://(.*\.)?selftest\.study|https://(.*\.)?run\.app)$"
origin = "https://selftest.study"

match = re.match(origin_regex, origin)
print(f"Match for '{origin}': {bool(match)}")

origin2 = "https://www.selftest.study"
match2 = re.match(origin_regex, origin2)
print(f"Match for '{origin2}': {bool(match2)}")

origin3 = "https://backend-351771281344.us-central1.run.app"
match3 = re.match(origin_regex, origin3)
print(f"Match for '{origin3}': {bool(match3)}")
