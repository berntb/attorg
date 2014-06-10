//    This file is part of attorg.  Copyright 2013 Bernt Budde.
//
//    Attorg is free software: you can redistribute it and/or modify
//    it under the terms of the GNU General Public License as published by
//    the Free Software Foundation, either version 3 of the License, or
//    (at your option) any later version.
//
//    Attorg is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU General Public License for more details.
//
//    You should have received a copy of the GNU General Public License
//    along with Attorg.  If not, see <http://www.gnu.org/licenses/>.

//    The author is Bernt Budde, see my GitHub account, user berntb.

// Some M-/C-/etc escapes are supported, but the idea is to support
// most changes from a mouse.

// ----------------------------------------------------------------------

// Global variable for model data, replace with some VMC-variant.
var stored_model     = {};
var org_controllers  = {};

alert("IN duh.js!");
