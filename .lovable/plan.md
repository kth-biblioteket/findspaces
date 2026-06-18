Begränsade justeringar i studentvyn för tydligare kort:

1. **SpaceCard.tsx**
   - **Lokalnamn**: Ändra rubriken från `text-base md:text-lg font-semibold` till `text-xl md:text-2xl font-bold text-[var(--kth-navy)]`.
   - **Hover-skugga**: Ändra från `hover:shadow-md` till `hover:shadow-lg` för mjukare och tydligare avgränsning vid hovring.
   - **Bild på desktop**: Ändra bildbehållarens klasser så att `md:aspect-[3/2] md:h-auto` blir `md:aspect-auto md:h-full`. Då fyller bilden hela kortets höjd på desktop utan att tappa karusell-funktionen. Rundningen på mobil (`rounded-t-2xl`) och höger på desktop (`md:rounded-r-2xl`) behålls oförändrad.
   - Notering: `rounded-2xl` på kortet finns redan sedan tidigare och behöver ej ändras.

2. **index.tsx**
   - Ändra avståndet mellan korten i listan från `space-y-2 md:space-y-2` till `space-y-3 md:space-y-3`.