-- Sample menus so the app has data to display.
insert into public.menus (title, body, ingredients, carbon_footprint_kg, fans_appreciation, supplier_name)
values
  (
    'Margherita Pizza',
    'Classic wood-fired pizza with tomato, mozzarella and fresh basil.',
    array['pizza dough', 'tomato sauce', 'mozzarella', 'basil', 'olive oil'],
    1.20,
    4.7,
    'Bella Italia Foods'
  ),
  (
    'Beef Burger',
    'Grilled beef patty with cheddar, lettuce and tomato in a brioche bun.',
    array['beef patty', 'brioche bun', 'cheddar', 'lettuce', 'tomato', 'pickles'],
    7.80,
    4.5,
    'Prairie Meats Co.'
  ),
  (
    'Lentil Curry',
    'Slow-cooked red lentils in a coconut and spice sauce, served with rice.',
    array['red lentils', 'coconut milk', 'onion', 'garlic', 'curry spices', 'basmati rice'],
    0.60,
    4.3,
    'Green Valley Organics'
  ),
  (
    'Salmon Poke Bowl',
    'Marinated salmon over sushi rice with avocado, edamame and sesame.',
    array['salmon', 'sushi rice', 'avocado', 'edamame', 'cucumber', 'sesame seeds', 'soy sauce'],
    2.40,
    4.8,
    'Nordic Seafood Ltd'
  );
