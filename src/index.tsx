import "minireset.css";
import "mobx-react-lite/batchingForReactDom";
import "uuid";
import { Office } from "./core/Office";
import { Sync } from "./core/Sync";
import "./index.scss";
import { UI } from "./ui/UI";

const office = new Office();
const sync = new Sync(office);
const ui = new UI(office, sync);

Object.assign(window, { office, sync, ui });
