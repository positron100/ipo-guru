import { test } from "node:test";
import { demo as validate } from "./validate.ts";
import { demo as parseUtil } from "./ipowatch/parse-util.ts";
import { demo as robots } from "./ipowatch/robots.ts";

test("validation rules", validate);
test("text parsing helpers", parseUtil);
test("robots.txt rules", robots);
