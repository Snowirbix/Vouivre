import vouivre from "./vouivre";
import directives from "./directives";
import modifiers from "./modifiers";
import Interpolation from "./interpolation";
import { bind, unbind } from "./bind";

vouivre.bindDirectives = bind;
vouivre.unbindDirectives = unbind;
vouivre.directives = directives;
vouivre.interpolation = new Interpolation();
vouivre.modifiers = modifiers;

export default vouivre;
